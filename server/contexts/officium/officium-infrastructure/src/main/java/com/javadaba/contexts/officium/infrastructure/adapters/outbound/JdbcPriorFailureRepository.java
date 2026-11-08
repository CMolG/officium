package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.PriorFailures.Failure;
import com.javadaba.contexts.officium.domain.QualityRule;
import com.javadaba.contexts.officium.domain.ReviewReturnReason;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.ports.PriorFailureRepository;
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
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * The failure rows of a project's window (card://JAVA-1803): the send-backs with the findings comment cut to
 * {@link #QUOTE_CHARS} characters and the rules of their review outcome, and the escaped defects of origin cards. One
 * statement per kind, each capped, so the cost of an answer does not grow with the project's history.
 */
@ApplicationScoped
public class JdbcPriorFailureRepository implements PriorFailureRepository {

    private static final int QUOTE_CHARS = 500;

    private static final String SEND_BACKS = "select rr.id, c.key, c.title, c.category, c.signals, rr.returned_at, "
            + "rr.reasons, rr.from_status, rr.to_status, rr.role, left(m.text, " + QUOTE_CHARS + ") as quote, "
            + "(select o.rule_violations from officium_card_review_outcome o where o.review_return_id = rr.id limit 1) "
            + "as rules from officium_card_review_return rr "
            + "join officium_card c on c.id = rr.card_id and c.deleted_at is null "
            + "left join officium_card_comment m on m.id = rr.comment_id "
            + "where rr.project_id = ? and rr.returned_at >= ? order by rr.returned_at desc, rr.id limit ?";

    private static final String ESCAPES = "select ed.id, c.key, c.title, c.category, c.signals, ed.recorded_at, ed.rules "
            + "from officium_card_escaped_defect ed join officium_card c on c.id = ed.origin_card_id and c.deleted_at is null "
            + "where ed.project_id = ? and ed.recorded_at >= ? order by ed.recorded_at desc, ed.id limit ?";

    private final DataSource dataSource;

    public JdbcPriorFailureRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Window window(UUID projectId, Instant since, int limit) {
        // One row more than the cap says the kind was truncated, without a second count.
        List<Failure> backs = read(SEND_BACKS, projectId, since, limit + 1, JdbcPriorFailureRepository::sendBack);
        List<Failure> escapes = read(ESCAPES, projectId, since, limit + 1, JdbcPriorFailureRepository::escape);
        List<Failure> rows = Stream.concat(backs.stream().limit(limit), escapes.stream().limit(limit))
                .sorted(Comparator.comparing(Failure::at, Comparator.reverseOrder()))
                .toList();
        return new Window(rows, backs.size() > limit || escapes.size() > limit);
    }

    private interface Mapper {
        Failure map(ResultSet rows) throws SQLException;
    }

    private List<Failure> read(String sql, UUID projectId, Instant since, int limit, Mapper mapper) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            statement.setTimestamp(2, Timestamp.from(since));
            statement.setInt(3, limit);
            try (ResultSet rows = statement.executeQuery()) {
                List<Failure> result = new ArrayList<>();
                while (rows.next()) {
                    result.add(mapper.map(rows));
                }
                return result;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the failure window", ex);
        }
    }

    private static Failure sendBack(ResultSet rows) throws SQLException {
        return new Failure(rows.getObject("id", UUID.class), Failure.Kind.SEND_BACK, category(rows),
                rows.getString("key"), signals(rows), rows.getTimestamp("returned_at").toInstant(),
                reasons(rows.getArray("reasons")), rules(rows.getArray("rules")), rows.getString("quote"),
                rows.getString("title"), rows.getString("from_status"), rows.getString("to_status"),
                rows.getString("role"));
    }

    private static Failure escape(ResultSet rows) throws SQLException {
        return new Failure(rows.getObject("id", UUID.class), Failure.Kind.ESCAPED_DEFECT, category(rows),
                rows.getString("key"), signals(rows), rows.getTimestamp("recorded_at").toInstant(), List.of(),
                rules(rows.getArray("rules")), null, rows.getString("title"), null, null, null);
    }

    private static Category category(ResultSet rows) throws SQLException {
        String wire = rows.getString("category");
        return wire == null ? null : Category.fromWire(wire);
    }

    private static List<Signal> signals(ResultSet rows) throws SQLException {
        return Signal.fromWire(strings(rows.getArray("signals")));
    }

    private static List<ReviewReturnReason> reasons(Array reasons) throws SQLException {
        return strings(reasons).stream().map(ReviewReturnReason::fromWire).toList();
    }

    private static List<QualityRule> rules(Array rules) throws SQLException {
        return QualityRule.parseAll(strings(rules));
    }

    private static List<String> strings(Array array) throws SQLException {
        if (array == null) {
            return List.of();
        }
        List<String> values = new ArrayList<>();
        for (Object value : (Object[]) array.getArray()) {
            values.add(value.toString());
        }
        return values;
    }
}
