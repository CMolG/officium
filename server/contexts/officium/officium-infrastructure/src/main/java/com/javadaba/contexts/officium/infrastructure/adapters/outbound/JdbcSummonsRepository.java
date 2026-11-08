package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Summons;
import com.javadaba.contexts.officium.domain.SummonsItem;
import com.javadaba.contexts.officium.domain.ports.SummonsRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JdbcSummonsRepository implements SummonsRepository {

    private static final String REQUESTS = """
            select r.id as request_id, c.id as card_id, c.key, c.title, r.action, r.detail
              from officium_card_request r
              join officium_card c on c.id = r.card_id
             where r.project_id = ? and r.status = 'open' and c.deleted_at is null
             order by r.created_at""";

    /**
     * A human card with a form it has not answered (answering moves it to Ready), assigned to the
     * account or to nobody, that blocks an AI card an agent will still work. With a sprint active only
     * its cards count; with none, any.
     */
    private static final String FORMS = """
            select c.id as card_id, c.key, c.title, string_agg(distinct b.key, ', ') as unblocks
              from officium_card_form f
              join officium_card c on c.id = f.card_id
              join officium_card_link l on l.source_card_id = c.id and l.type = 'BLOCKS'
              join officium_card b on b.id = l.target_card_id
             where c.project_id = ? and c.deleted_at is null and c.executor = 'human'
               and c.status in ('refine', 'todo', 'doing')
               and (c.assignees = '[]'::jsonb or c.assignees @> cast(? as jsonb))
               and b.deleted_at is null and b.executor = 'ai' and b.status not in ('deploy', 'done', 'rejected')
               and (b.sprint_id = (select s.id from officium_sprint s where s.project_id = b.project_id
                                    and s.state = 'active')
                    or not exists (select 1 from officium_sprint s where s.project_id = b.project_id
                                    and s.state = 'active'))
             group by c.id, c.key, c.title, c.card_order
             order by c.card_order""";

    private static final String COLUMNS = "id, project_id, account_id, item_ids, round, summoned_at, summoned_by, "
            + "delivered, shown_at, seen_at, snoozed_until, closed_at, close_reason, asked_at";

    private static final String SAVE = """
            insert into officium_summons (id, project_id, account_id, item_ids, round, summoned_at, summoned_by,
                                          delivered, shown_at, seen_at, snoozed_until, closed_at, close_reason,
                                          asked_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict (id) do update
              set item_ids = excluded.item_ids, round = excluded.round, summoned_at = excluded.summoned_at,
                  summoned_by = excluded.summoned_by, delivered = excluded.delivered, shown_at = excluded.shown_at,
                  seen_at = excluded.seen_at, snoozed_until = excluded.snoozed_until,
                  closed_at = excluded.closed_at, close_reason = excluded.close_reason,
                  asked_at = excluded.asked_at""";

    private final DataSource dataSource;

    public JdbcSummonsRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<SummonsItem> pending(UUID projectId, UUID accountId) {
        List<SummonsItem> items = new ArrayList<>();
        try (Connection connection = dataSource.getConnection()) {
            try (PreparedStatement statement = connection.prepareStatement(REQUESTS)) {
                statement.setObject(1, projectId);
                try (ResultSet rs = statement.executeQuery()) {
                    while (rs.next()) {
                        UUID requestId = rs.getObject("request_id", UUID.class);
                        String key = rs.getString("key");
                        items.add(new SummonsItem(SummonsItem.requestId(requestId), SummonsItem.REQUEST,
                                rs.getObject("card_id", UUID.class), key, rs.getString("title"), key, requestId,
                                rs.getString("action"), rs.getString("detail")));
                    }
                }
            }
            try (PreparedStatement statement = connection.prepareStatement(FORMS)) {
                statement.setObject(1, projectId);
                statement.setString(2, "[{\"accountId\":\"" + accountId + "\"}]");
                try (ResultSet rs = statement.executeQuery()) {
                    while (rs.next()) {
                        UUID cardId = rs.getObject("card_id", UUID.class);
                        items.add(new SummonsItem(SummonsItem.formId(cardId), SummonsItem.FORM, cardId,
                                rs.getString("key"), rs.getString("title"), rs.getString("unblocks"), null, null,
                                null));
                    }
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read what " + accountId + " is pending on in " + projectId,
                    ex);
        }
        return items;
    }

    @Override
    public Optional<Summons> findOpen(UUID accountId, UUID projectId) {
        return one("select " + COLUMNS + " from officium_summons where account_id = ? and project_id = ? "
                + "and closed_at is null", accountId, projectId);
    }

    @Override
    public Optional<Summons> find(UUID summonsId) {
        return one("select " + COLUMNS + " from officium_summons where id = ?", summonsId);
    }

    @Override
    public List<Summons> openFor(UUID accountId) {
        return many("select " + COLUMNS + " from officium_summons where account_id = ? and closed_at is null "
                + "order by summoned_at", accountId);
    }

    @Override
    public void save(Summons s) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(SAVE)) {
            statement.setObject(1, s.id());
            statement.setObject(2, s.projectId());
            statement.setObject(3, s.accountId());
            statement.setArray(4, connection.createArrayOf("text", s.itemIds().toArray()));
            statement.setInt(5, s.round());
            statement.setTimestamp(6, Timestamp.from(s.summonedAt()));
            statement.setString(7, s.summonedBy());
            statement.setBoolean(8, s.delivered());
            statement.setTimestamp(9, timestamp(s.shownAt()));
            statement.setTimestamp(10, timestamp(s.seenAt()));
            statement.setTimestamp(11, timestamp(s.snoozedUntil()));
            statement.setTimestamp(12, timestamp(s.closedAt()));
            statement.setString(13, s.closeReason());
            statement.setTimestamp(14, Timestamp.from(s.askedAt()));
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the summons " + s.id(), ex);
        }
    }

    private Optional<Summons> one(String sql, Object... params) {
        return many(sql, params).stream().findFirst();
    }

    private List<Summons> many(String sql, Object... params) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                statement.setObject(i + 1, params[i]);
            }
            try (ResultSet rs = statement.executeQuery()) {
                List<Summons> rows = new ArrayList<>();
                while (rs.next()) {
                    rows.add(map(rs));
                }
                return rows;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read summons rounds", ex);
        }
    }

    private static Summons map(ResultSet rs) throws SQLException {
        Array ids = rs.getArray("item_ids");
        return new Summons(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                rs.getObject("account_id", UUID.class), Arrays.asList((String[]) ids.getArray()), rs.getInt("round"),
                rs.getTimestamp("summoned_at").toInstant(), rs.getString("summoned_by"), rs.getBoolean("delivered"),
                instant(rs, "shown_at"), instant(rs, "seen_at"), instant(rs, "snoozed_until"),
                instant(rs, "closed_at"), rs.getString("close_reason"), instant(rs, "asked_at"));
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private static Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }
}
