package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;

/**
 * JAVA-1146, {@code cards.next {beyondSprint}}: what an agent takes when nothing in the active
 * sprint is eligible. First an eligible {@code ai} card outside the sprint that blocks (directly,
 * or through a chain of {@code ai} blockers) a blocked {@code ai} card of the sprint, ordered by
 * that blocked card's priority; else the best eligible card that is in no sprint. A chain stops at
 * a {@code human} card: a wall is a person's, never handed out.
 *
 * <p>JAVA-1686: a project with precedence rules ranks its candidates by the first rule each one
 * matches, after the hotfix and security arms and before priority. Without rules the statements are
 * the unranked ones, byte for byte, and the rules are one extra read.
 */
final class JdbcNextCard {

    private static final String ACTIVE = "(select s.id from officium_sprint s where s.project_id = ? "
            + "and s.state = 'active')";

    /** The statuses past which a blocker blocks nobody: Deploy and Done, the token {@link #held} swaps for Done alone
     *  when the project holds cards behind Deploy (JAVA-1820). */
    private static final String OVER = "@over@";

    private static final String ELIGIBLE = "b.project_id = ? and b.deleted_at is null and b.executor = 'ai' "
            + "and b.status in " + JdbcCardRepository.NEXT_PHASES + " and b.category is distinct from 'epic' "
            + "and not (b.id = any(?)) and not exists (select 1 from officium_card_link l "
            + "join officium_card k on k.id = l.source_card_id where l.type = 'BLOCKS' and l.target_card_id = b.id "
            + "and k.status not in " + OVER + " and k.deleted_at is null) ";

    private static final String IN_SPRINT_FROM = "select c.id"
            + " from officium_card c where c.project_id = ? and c.deleted_at is null and c.executor = 'ai' "
            // JAVA-372: every phase the loop works. Doing is someone's already, and Deploy waits
            // on the user's merge, which is a check, not work.
            + "and c.status in " + JdbcCardRepository.NEXT_PHASES + " "
            // JAVA-212: an epic is an umbrella -- its work is its children, picked one by one.
            + "and c.category is distinct from 'epic' "
            + "and not (c.id = any(?)) "
            // JAVA-53: with a sprint active, the work planned for it comes first -- and only it.
            + "and (c.sprint_id = (select s.id from officium_sprint s where s.project_id = c.project_id "
            + "and s.state = 'active') or not exists (select 1 from officium_sprint s "
            + "where s.project_id = c.project_id and s.state = 'active')) "
            // In every phase: a card waiting on a person is blocked by its wall, and handing it out
            // anyway would give it to every iteration of the loop.
            + "and not exists ("
            + "select 1 from officium_card_link l join officium_card b on b.id = l.source_card_id "
            + "where l.type = 'BLOCKS' and l.target_card_id = c.id and b.status not in " + OVER
            + " "
            + "and b.deleted_at is null) ";

    /** Blocked ai cards of the sprint, then their ai blockers upward; each keeps the best priority
     *  of the blocked card it ends up behind. */
    private static final String CHAIN_FIRST_FROM = "with recursive chain(id, pr) as ("
            + "select c.id, " + JdbcCardRepository.PRIORITY_RANK_CASE.replace("priority", "c.priority")
            + " from officium_card c where c.project_id = ? and c.deleted_at is null and c.executor = 'ai' "
            + "and c.category is distinct from 'epic' and c.status not in " + JdbcCardRepository.FINISHED + " "
            + "and c.sprint_id = " + ACTIVE + " and exists (select 1 from officium_card_link l "
            + "join officium_card k on k.id = l.source_card_id where l.type = 'BLOCKS' and l.target_card_id = c.id "
            + "and k.status not in " + OVER + " and k.deleted_at is null) "
            + "union select k.id, chain.pr from chain join officium_card_link l "
            + "on l.target_card_id = chain.id and l.type = 'BLOCKS' join officium_card k on k.id = l.source_card_id "
            + "where k.deleted_at is null and k.executor = 'ai' and k.status not in "
            + OVER + ") "
            + "select b.id from officium_card b join (select id, min(pr) pr from chain group by id) ch "
            + "on ch.id = b.id where " + ELIGIBLE + "and (b.sprint_id is null or b.sprint_id is distinct from "
            + ACTIVE + ") ";

    private static final String NO_SPRINT_FROM = "select b.id from officium_card b where " + ELIGIBLE
            + "and b.sprint_id is null ";

    static final String IN_SPRINT = held(inSprint(false), false);
    static final String CHAIN_FIRST = held(chainFirst(false), false);
    static final String NO_SPRINT = held(noSprint(false), false);

    static final String RANKED_IN_SPRINT = held(inSprint(true), false);
    static final String RANKED_CHAIN_FIRST = held(chainFirst(true), false);
    static final String RANKED_NO_SPRINT = held(noSprint(true), false);

    /** The same six for a project whose gate holds the cards that wait on a card in Deploy (JAVA-1820). */
    static final String HELD_IN_SPRINT = held(inSprint(false), true);
    static final String HELD_CHAIN_FIRST = held(chainFirst(false), true);
    static final String HELD_NO_SPRINT = held(noSprint(false), true);

    static final String HELD_RANKED_IN_SPRINT = held(inSprint(true), true);
    static final String HELD_RANKED_CHAIN_FIRST = held(chainFirst(true), true);
    static final String HELD_RANKED_NO_SPRINT = held(noSprint(true), true);

    private JdbcNextCard() {
    }

    private static String inSprint(boolean ranked) {
        return from(IN_SPRINT_FROM, ranked) + "order by " + order("c", ranked) + "limit 1";
    }

    private static String chainFirst(boolean ranked) {
        return from(CHAIN_FIRST_FROM, ranked) + "order by ch.pr asc, " + order("b", ranked) + "limit 1";
    }

    private static String noSprint(boolean ranked) {
        return from(NO_SPRINT_FROM, ranked) + "order by " + order("b", ranked) + "limit 1";
    }

    /** {@code sql} with a blocker in Deploy counted as finished, as it always was; or, held, only Done (JAVA-1820). */
    private static String held(String sql, boolean held) {
        return sql.replace(OVER, held ? "('done')" : JdbcCardRepository.FINISHED);
    }

    /** The statement's source, with the precedence ranking in front of it when the statement ranks. */
    private static String from(String source, boolean ranked) {
        return ranked ? PrecedenceSql.withRanking(source) : source;
    }

    /**
     * The order a card is handed out in. A hotfix goes first (JAVA-385). The ranked form puts the precedence
     * rank before priority: the first rule the card matches, or past every rule (JAVA-1686). Security goes
     * ahead of the other categories only within its priority (JAVA-1808, owner, 2026-10-21).
     */
    private static String order(String card, boolean ranked) {
        return "case " + card + ".category when 'hotfix' then 0 else 1 end asc, "
                + (ranked ? PrecedenceSql.rank(card) + " asc, " : "")
                + JdbcCardRepository.PRIORITY_RANK_CASE.replace("priority", card + ".priority") + " asc, "
                + "case " + card + ".category when 'security' then 0 else 1 end asc, "
                + JdbcCardRepository.NEXT_PHASE_RANK_CASE.replace("c.status", card + ".status") + " asc, "
                + card + ".card_order asc ";
    }

    static Optional<UUID> nextId(DataSource dataSource, UUID projectId, Set<UUID> skip, boolean beyondSprint) {
        Optional<String> ranking = JdbcPrecedenceRanking.of(dataSource, projectId);
        boolean ranked = ranking.isPresent();
        boolean held = JdbcIntegrationGateHeld.enabled(dataSource, projectId);
        try (Connection connection = dataSource.getConnection()) {
            Object[] skipped = skip.toArray();
            if (!beyondSprint) {
                return first(connection, pick(ranked, held, IN_SPRINT, RANKED_IN_SPRINT, HELD_IN_SPRINT,
                        HELD_RANKED_IN_SPRINT), with(ranking, projectId, skipped));
            }
            Optional<UUID> blocker = first(connection, pick(ranked, held, CHAIN_FIRST, RANKED_CHAIN_FIRST,
                    HELD_CHAIN_FIRST, HELD_RANKED_CHAIN_FIRST),
                    with(ranking, projectId, projectId, projectId, skipped, projectId));
            return blocker.isPresent()
                    ? blocker
                    : first(connection, pick(ranked, held, NO_SPRINT, RANKED_NO_SPRINT, HELD_NO_SPRINT,
                            HELD_RANKED_NO_SPRINT), with(ranking, projectId, skipped));
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to compute next eligible card for " + projectId, ex);
        }
    }

    static String pick(boolean ranked, boolean held, String plain, String rankedSql, String heldSql,
            String heldRankedSql) {
        return held ? (ranked ? heldRankedSql : heldSql) : (ranked ? rankedSql : plain);
    }

    /** The ranking when the project has one, then the statement's parameters: the ranked SQL binds it first. */
    private static Object[] with(Optional<String> ranking, Object... params) {
        List<Object> all = new ArrayList<>();
        ranking.ifPresent(all::add);
        all.addAll(List.of(params));
        return all.toArray();
    }

    private static Optional<UUID> first(Connection connection, String sql, Object... params) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                if (params[i] instanceof Object[] array) {
                    statement.setArray(i + 1, connection.createArrayOf("uuid", array));
                } else {
                    statement.setObject(i + 1, params[i]);
                }
            }
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(rs.getObject(1, UUID.class)) : Optional.empty();
            }
        }
    }
}
