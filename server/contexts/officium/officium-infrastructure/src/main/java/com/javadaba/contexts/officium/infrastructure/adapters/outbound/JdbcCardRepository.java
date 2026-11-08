package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Assignee;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardChanges;
import com.javadaba.contexts.officium.domain.CardRejection;
import com.javadaba.contexts.officium.domain.CardSearchCriteria;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Page;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.ProjectFacets;
import com.javadaba.contexts.officium.domain.SendBack;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class JdbcCardRepository implements CardRepository {

    /** {@link Status#finished()} in SQL, derived so a new finished state can't be missed here:
     *  a blocker in one of these blocks nobody. */
    static final String FINISHED = Arrays.stream(Status.values()).filter(Status::finished)
            .map(s -> "'" + s.wire() + "'").collect(Collectors.joining(", ", "(", ")"));

    /** {@link Status#needsPerson()} in SQL: the statuses a human card is in "Needs you" from. */
    private static final String NEEDS_PERSON = Arrays.stream(Status.values()).filter(Status::needsPerson)
            .map(s -> "'" + s.wire() + "'").collect(Collectors.joining(", ", "(", ")"));

    private static final String SELECT = "select " + CardRows.COLUMNS + " from officium_card";

    /** {@code case priority when ... end} so a plain SQL {@code order by} matches
     *  {@link Priority#rank()} without a stored numeric column. */
    static final String PRIORITY_RANK_CASE = "case priority when 'superHigh' then 0 when 'high' then 1 when 'medium' then 2 when 'low' then 3 else 4 end";

    /** The columns {@code cards.next} hands out, in the order it prefers them at equal priority
     *  (user decision, JAVA-372): finished work is verified before new work starts. */
    private static final List<Status> NEXT_ORDER = List.of(Status.REVIEW, Status.READY, Status.TODO, Status.REFINE);

    static final String NEXT_PHASES = NEXT_ORDER.stream().map(s -> "'" + s.wire() + "'")
            .collect(Collectors.joining(", ", "(", ")"));

    static final String NEXT_PHASE_RANK_CASE = NEXT_ORDER.stream()
            .map(s -> "when '" + s.wire() + "' then " + NEXT_ORDER.indexOf(s))
            .collect(Collectors.joining(" ", "case c.status ", " end"));

    /** {@link Card#humanEditPending()} in SQL. */
    private static final String HUMAN_EDIT_PENDING = "(human_edited_at is not null and "
            + "(human_edit_reviewed_at is null or human_edit_reviewed_at < human_edited_at))";

    private final DataSource dataSource;

    public JdbcCardRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Card insert(Card card) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(CardRows.INSERT_SQL)) {
            CardRows.bindInsert(connection, statement, card);
            statement.executeUpdate();
            return card;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert card", ex);
        }
    }

    /** Caller-managed {@link Connection} so {@link JdbcCardBatchWriter} can run this in the same
     *  transaction as the comment/attachment/link batches. */
    void insertBatch(Connection connection, List<Card> cardsToInsert) throws SQLException {
        if (cardsToInsert.isEmpty()) {
            return;
        }
        try (PreparedStatement statement = connection.prepareStatement(CardRows.INSERT_SQL)) {
            for (Card card : cardsToInsert) {
                CardRows.bindInsert(connection, statement, card);
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    @Override
    public Optional<Card> findById(UUID projectId, UUID cardId) {
        return findOne(SELECT + " where project_id = ? and id = ?", projectId, cardId);
    }

    @Override
    public Optional<Card> findByKey(UUID projectId, String key) {
        return findOne(SELECT + " where project_id = ? and key = ?", projectId, key);
    }

    @Override
    public Optional<Card> findByClientKey(UUID projectId, String clientKey) {
        return findOne(SELECT + " where project_id = ? and client_key = ?", projectId, clientKey);
    }

    private Optional<Card> findOne(String sql, UUID projectId, Object second) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            statement.setObject(2, second);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(CardRows.map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read card", ex);
        }
    }

    @Override
    public Page<Card> search(UUID projectId, CardSearchCriteria criteria) {
        int offset = decodeCursor(criteria.cursor());
        StringBuilder sql = new StringBuilder(SELECT + " where project_id = ? and deleted_at is null");
        List<Object> params = new ArrayList<>();
        params.add(projectId);
        if (criteria.text() != null && !criteria.text().isBlank()) {
            sql.append(" and (title ilike ? or description ilike ? or action_plan ilike ?)");
            String pattern = "%" + criteria.text() + "%";
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
        }
        if (criteria.humanEditPending() != null) {
            sql.append(criteria.humanEditPending() ? " and " : " and not ").append(HUMAN_EDIT_PENDING);
        }
        if (criteria.status() != null) {
            sql.append(" and status = ?");
            params.add(criteria.status().wire());
        }
        if (criteria.priority() != null) {
            sql.append(" and priority = ?");
            params.add(criteria.priority().wire());
        }
        if (criteria.epic() != null) {
            sql.append(" and epic = ?");
            params.add(criteria.epic());
        }
        if (criteria.tag() != null) {
            sql.append(" and ? = any(tags)");
            params.add(criteria.tag());
        }
        if (criteria.signal() != null) {
            sql.append(" and ? = any(signals)");
            params.add(criteria.signal().wire());
        }
        if (criteria.rejection() != null) {
            sql.append(" and rejection_reason = ?");
            params.add(criteria.rejection().wire());
        }
        if (criteria.executor() != null) {
            sql.append(" and executor = ?");
            params.add(criteria.executor().wire());
        }
        if (criteria.category() != null) {
            sql.append(" and category = ?");
            params.add(criteria.category().wire());
        }
        if (criteria.sprint() != null) {
            if (criteria.sprint().none()) {
                sql.append(" and false");
            } else if (criteria.sprint().sprintId() == null) {
                sql.append(" and sprint_id is null");
            } else {
                sql.append(" and sprint_id = ?");
                params.add(criteria.sprint().sprintId());
            }
        }
        if (criteria.assignee() != null) {
            if (criteria.assignee().accountId() != null) {
                sql.append(" and assignees @> cast(? as jsonb)");
                params.add("[{\"accountId\":\"" + criteria.assignee().accountId() + "\"}]");
            } else if (criteria.assignee().name() != null) {
                sql.append(" and exists (select 1 from jsonb_array_elements(assignees) a where a->>'name' = ?)");
                params.add(criteria.assignee().name());
            }
        }
        if (criteria.blocked() != null) {
            String blockedExpr = "exists (select 1 from officium_card_link l join officium_card b "
                    + "on b.id = l.source_card_id where l.type = 'BLOCKS' and l.target_card_id = officium_card.id "
                    + "and b.status not in " + FINISHED + " and b.deleted_at is null)";
            sql.append(criteria.blocked() ? " and " + blockedExpr : " and not " + blockedExpr);
        }
        sql.append(" order by ").append(orderClause(criteria.sort())).append(" limit ? offset ?");
        params.add(criteria.limit() + 1);
        params.add(offset);
        List<Card> rows = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql.toString())) {
            for (int i = 0; i < params.size(); i++) {
                statement.setObject(i + 1, params.get(i));
            }
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    rows.add(CardRows.map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to search cards for " + projectId, ex);
        }
        boolean hasMore = rows.size() > criteria.limit();
        List<Card> page = hasMore ? rows.subList(0, criteria.limit()) : rows;
        return new Page<>(page, hasMore ? encodeCursor(offset + criteria.limit()) : null);
    }

    private static String orderClause(CardSearchCriteria.Sort sort) {
        return switch (sort) {
            case ORDER -> "card_order asc, id asc";
            case PRIORITY -> PRIORITY_RANK_CASE + " asc, id asc";
            case UPDATED -> "updated_at desc, id asc";
            case CREATED -> "created_at desc, id asc";
        };
    }

    @Override
    public List<UUID> columnOrder(UUID projectId, Status status) {
        List<UUID> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select id from officium_card where project_id = ? and status = ? and deleted_at is null "
                                + "order by card_order asc")) {
            statement.setObject(1, projectId);
            statement.setString(2, status.wire());
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(rs.getObject("id", UUID.class));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read column order for " + projectId, ex);
        }
        return result;
    }

    @Override
    public boolean updateIfVersion(Card updated, int expectedVersion) {
        String sql = "update officium_card set title = ?, description = ?, action_plan = ?, priority = ?, "
                + "executor = ?, run_state = ?, estimate = ?, epic = ?, tags = ?, assignees = cast(? as jsonb), "
                + "version = ?, updated_at = ?, updated_by = cast(? as jsonb), deleted_at = ?, human_edited_at = ?, "
                + "human_edited_by = cast(? as jsonb), human_edit_reviewed_at = ?, category = ?, signals = ?, subtype = ? "
                + "where id = ? and project_id = ? and version = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, updated.title());
            statement.setString(2, updated.description());
            statement.setString(3, updated.actionPlan());
            statement.setString(4, updated.priority().wire());
            statement.setString(5, updated.executor().wire());
            statement.setString(6, updated.runState().wire());
            statement.setDouble(7, updated.estimate());
            statement.setString(8, updated.epic());
            statement.setArray(9, connection.createArrayOf("text", updated.tags().toArray()));
            statement.setString(10, OfficiumJson.writeAssignees(updated.assignees()));
            statement.setInt(11, updated.version());
            statement.setTimestamp(12, Timestamp.from(updated.updatedAt()));
            statement.setString(13, OfficiumJson.writeActor(updated.updatedBy()));
            statement.setTimestamp(14, updated.deletedAt() == null ? null : Timestamp.from(updated.deletedAt()));
            CardRows.bindHumanEdit(statement, 15, updated.humanEdit());
            statement.setString(18, CardRows.categoryWire(updated));
            statement.setArray(19, CardRows.signalsArray(connection, updated));
            statement.setString(20, CardRows.subtypeWire(updated));
            statement.setObject(21, updated.id());
            statement.setObject(22, updated.projectId());
            statement.setInt(23, expectedVersion);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to update card " + updated.id(), ex);
        }
    }

    @Override
    public boolean markHumanEditReviewed(UUID projectId, UUID cardId, Instant reviewedAt) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "update officium_card set human_edit_reviewed_at = ? where id = ? and project_id = ? "
                                + "and human_edited_at is not null and deleted_at is null")) {
            statement.setTimestamp(1, Timestamp.from(reviewedAt));
            statement.setObject(2, cardId);
            statement.setObject(3, projectId);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to mark the human edit of " + cardId + " reviewed", ex);
        }
    }

    @Override
    public boolean deleteIfVersion(UUID projectId, UUID cardId, int expectedVersion, Instant deletedAt, Actor actor) {
        String sql = "update officium_card set deleted_at = ?, version = version + 1, updated_at = ?, "
                + "updated_by = cast(? as jsonb) where id = ? and project_id = ? and version = ? "
                + "and deleted_at is null";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setTimestamp(1, Timestamp.from(deletedAt));
            statement.setTimestamp(2, Timestamp.from(deletedAt));
            statement.setString(3, OfficiumJson.writeActor(actor));
            statement.setObject(4, cardId);
            statement.setObject(5, projectId);
            statement.setInt(6, expectedVersion);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to delete card " + cardId, ex);
        }
    }

    @Override
    public boolean moveIfVersion(UUID projectId, UUID cardId, int expectedVersion, Status newStatus,
            Map<UUID, Integer> sourceColumnOrder, Map<UUID, Integer> destColumnOrder, Instant now,
            CardRejection rejection, SendBack sendBack) {
        return JdbcCardMoves.move(dataSource, projectId, cardId, expectedVersion, newStatus, sourceColumnOrder,
                destColumnOrder, now, rejection, sendBack);
    }

    @Override
    public List<UUID> sprintOrder(UUID projectId, UUID sprintId) {
        String sql = "select id from officium_card where project_id = ? and deleted_at is null and sprint_id "
                + (sprintId == null ? "is null" : "= ?") + " order by rank asc, number asc";
        List<UUID> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            if (sprintId != null) {
                statement.setObject(2, sprintId);
            }
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(rs.getObject("id", UUID.class));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the sprint order of " + projectId, ex);
        }
        return result;
    }

    @Override
    public boolean setSprintIfVersion(UUID projectId, UUID cardId, int expectedVersion, UUID sprintId,
            Map<UUID, Integer> sourceRanks, Map<UUID, Integer> destRanks, Instant now, Actor actor) {
        Integer newRank = destRanks.get(cardId);
        if (newRank == null) {
            throw new IllegalArgumentException("destRanks must contain the moving card");
        }
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                boolean moved;
                try (PreparedStatement statement = connection.prepareStatement(
                        "update officium_card set sprint_id = ?, rank = ?, version = version + 1, updated_at = ?, "
                                + "updated_by = cast(? as jsonb) where id = ? and project_id = ? and version = ? "
                                + "and deleted_at is null")) {
                    statement.setObject(1, sprintId);
                    statement.setInt(2, newRank);
                    statement.setTimestamp(3, Timestamp.from(now));
                    statement.setString(4, OfficiumJson.writeActor(actor));
                    statement.setObject(5, cardId);
                    statement.setObject(6, projectId);
                    statement.setInt(7, expectedVersion);
                    moved = statement.executeUpdate() == 1;
                }
                if (!moved) {
                    connection.rollback();
                    return false;
                }
                Set<UUID> touched = new LinkedHashSet<>();
                touched.add(cardId);
                for (Map<UUID, Integer> ranks : List.of(sourceRanks, destRanks)) {
                    for (Map.Entry<UUID, Integer> entry : ranks.entrySet()) {
                        if (touched.add(entry.getKey())) {
                            updateRankOnly(connection, entry.getKey(), entry.getValue());
                        }
                    }
                }
                connection.commit();
                return true;
            } catch (SQLException ex) {
                connection.rollback();
                throw ex;
            } finally {
                connection.setAutoCommit(true);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to plan card " + cardId, ex);
        }
    }

    @Override
    public void reassignSprint(UUID projectId, List<UUID> cardIds, UUID sprintId, Instant now, Actor actor) {
        if (cardIds.isEmpty()) {
            return;
        }
        int firstRank = sprintOrder(projectId, sprintId).size();
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (PreparedStatement statement = connection.prepareStatement(
                    "update officium_card set sprint_id = ?, rank = ?, version = version + 1, updated_at = ?, "
                            + "updated_by = cast(? as jsonb) where id = ? and project_id = ?")) {
                for (int i = 0; i < cardIds.size(); i++) {
                    statement.setObject(1, sprintId);
                    statement.setInt(2, firstRank + i);
                    statement.setTimestamp(3, Timestamp.from(now));
                    statement.setString(4, OfficiumJson.writeActor(actor));
                    statement.setObject(5, cardIds.get(i));
                    statement.setObject(6, projectId);
                    statement.addBatch();
                }
                statement.executeBatch();
                connection.commit();
            } catch (SQLException ex) {
                connection.rollback();
                throw ex;
            } finally {
                connection.setAutoCommit(true);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to move cards between sprints in " + projectId, ex);
        }
    }

    private void updateRankOnly(Connection connection, UUID cardId, int rank) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "update officium_card set rank = ? where id = ?")) {
            statement.setInt(1, rank);
            statement.setObject(2, cardId);
            statement.executeUpdate();
        }
    }

    @Override
    public Map<UUID, Status> blockerStatusById(UUID cardId) {
        return JdbcBlockers.statusByCard(dataSource, List.of(cardId)).getOrDefault(cardId, Map.of());
    }

    @Override
    public Map<UUID, Map<UUID, Status>> blockerStatusByCard(java.util.Collection<UUID> cardIds) {
        return JdbcBlockers.statusByCard(dataSource, cardIds);
    }

    @Override
    public Optional<Card> nextEligible(UUID projectId, Set<UUID> skip, boolean beyondSprint) {
        return JdbcNextCard.nextId(dataSource, projectId, skip, beyondSprint).flatMap(id -> findById(projectId, id));
    }

    @Override
    public List<Card> needsHuman(UUID projectId, UUID assigneeAccountId) {
        StringBuilder sql = new StringBuilder(
                SELECT + " where project_id = ? and deleted_at is null and executor = 'human' and status in "
                        + NEEDS_PERSON);
        if (assigneeAccountId != null) {
            sql.append(" and assignees @> cast(? as jsonb)");
        }
        sql.append(" order by card_order asc");
        List<Card> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql.toString())) {
            statement.setObject(1, projectId);
            if (assigneeAccountId != null) {
                statement.setString(2, "[{\"accountId\":\"" + assigneeAccountId + "\"}]");
            }
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(CardRows.map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list human cards for " + projectId, ex);
        }
        return result;
    }

    @Override
    public List<Card> findAllByProject(UUID projectId) {
        List<Card> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where project_id = ? and deleted_at is null order by card_order asc")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(CardRows.map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read all cards for " + projectId, ex);
        }
        return result;
    }

    @Override
    public List<Card> findLive(Category category, Status status) {
        List<Card> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where category = ? and status = ? and deleted_at is null")) {
            statement.setString(1, category.wire());
            statement.setString(2, status.wire());
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(CardRows.map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the " + category.wire() + " cards in " + status.wire(), ex);
        }
        return result;
    }

    /** {@code changed_at} is kept by triggers (changeset {@code officium/006}): every write to the
     *  row, a link added or removed at either end, and a blocker changing status or being deleted. */
    @Override
    public CardChanges changedSince(UUID projectId, Instant since) {
        String sql = since == null
                ? SELECT + " where project_id = ? and deleted_at is null and status not in ('" + Status.DONE.wire()
                        + "', '" + Status.REJECTED.wire() + "') order by card_order asc"
                : SELECT + " where project_id = ? and changed_at > ? order by card_order asc";
        List<Card> changed = new ArrayList<>();
        List<UUID> removed = new ArrayList<>();
        try (Connection connection = dataSource.getConnection()) {
            // Read BEFORE the rows: whatever commits between the two is sent again next time, never lost.
            Instant asOf;
            try (PreparedStatement statement = connection.prepareStatement("select clock_timestamp()");
                    ResultSet rs = statement.executeQuery()) {
                rs.next();
                asOf = rs.getTimestamp(1).toInstant();
            }
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setObject(1, projectId);
                if (since != null) {
                    statement.setTimestamp(2, Timestamp.from(since));
                }
                try (ResultSet rs = statement.executeQuery()) {
                    while (rs.next()) {
                        Card card = CardRows.map(rs);
                        if (card.deleted()) {
                            removed.add(card.id());
                        } else {
                            changed.add(card);
                        }
                    }
                }
            }
            return new CardChanges(changed, removed, asOf);
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the changes of " + projectId, ex);
        }
    }

    @Override
    public ProjectFacets facets(UUID projectId) {
        List<String> epics = new ArrayList<>();
        List<String> tags = new ArrayList<>();
        List<Assignee> assignees = new ArrayList<>();
        try (Connection connection = dataSource.getConnection()) {
            try (PreparedStatement statement = connection.prepareStatement(
                    "select distinct epic from officium_card where project_id = ? and deleted_at is null "
                            + "and epic is not null order by epic")) {
                statement.setObject(1, projectId);
                try (ResultSet rs = statement.executeQuery()) {
                    while (rs.next()) {
                        epics.add(rs.getString(1));
                    }
                }
            }
            try (PreparedStatement statement = connection.prepareStatement(
                    "select distinct unnest(tags) as tag from officium_card where project_id = ? "
                            + "and deleted_at is null order by tag")) {
                statement.setObject(1, projectId);
                try (ResultSet rs = statement.executeQuery()) {
                    while (rs.next()) {
                        tags.add(rs.getString(1));
                    }
                }
            }
            try (PreparedStatement statement = connection.prepareStatement(
                    "select distinct (elem->>'accountId') as account_id, (elem->>'name') as name "
                            + "from officium_card, jsonb_array_elements(assignees) as elem "
                            + "where project_id = ? and deleted_at is null order by name")) {
                statement.setObject(1, projectId);
                try (ResultSet rs = statement.executeQuery()) {
                    while (rs.next()) {
                        String accountId = rs.getString("account_id");
                        assignees.add(new Assignee(accountId == null ? null : UUID.fromString(accountId),
                                rs.getString("name")));
                    }
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to compute facets for " + projectId, ex);
        }
        return new ProjectFacets(epics, tags, assignees);
    }

    private static int decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return 0;
        }
        try {
            return Integer.parseInt(new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8));
        } catch (RuntimeException ex) {
            return 0;
        }
    }

    private static String encodeCursor(int offset) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(Integer.toString(offset).getBytes(StandardCharsets.UTF_8));
    }
}
