package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.ReviewReturn;
import com.javadaba.contexts.officium.domain.ReviewReturnReason;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.CardReviewReturnRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class JdbcCardReviewReturnRepository implements CardReviewReturnRepository {

    private static final String SELECT = "select id, project_id, card_id, returned_at, actor, role, from_status, "
            + "to_status, reasons, comment_id from officium_card_review_return ";

    private final DataSource dataSource;

    public JdbcCardReviewReturnRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<ReviewReturn> listByCard(UUID cardId) {
        return query(SELECT + "where card_id = ? order by returned_at, id",
                (connection, statement) -> statement.setObject(1, cardId));
    }

    @Override
    public Map<UUID, List<ReviewReturn>> listByCards(Collection<UUID> cardIds) {
        Map<UUID, List<ReviewReturn>> byCard = new LinkedHashMap<>();
        if (cardIds.isEmpty()) {
            return byCard;
        }
        query(SELECT + "where card_id = any (?) order by returned_at, id",
                (connection, statement) -> statement.setArray(1, connection.createArrayOf("uuid", cardIds.toArray())))
                .forEach(entry -> byCard.computeIfAbsent(entry.cardId(), id -> new ArrayList<>()).add(entry));
        return byCard;
    }

    @Override
    public List<ReviewReturn> listByProject(UUID projectId) {
        return query(SELECT + "where project_id = ? order by returned_at, id",
                (connection, statement) -> statement.setObject(1, projectId));
    }

    private interface Binder {
        void bind(Connection connection, PreparedStatement statement) throws SQLException;
    }

    private List<ReviewReturn> query(String sql, Binder binder) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            binder.bind(connection, statement);
            try (ResultSet rows = statement.executeQuery()) {
                List<ReviewReturn> result = new ArrayList<>();
                while (rows.next()) {
                    result.add(map(rows));
                }
                return result;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read review returns", ex);
        }
    }

    private static ReviewReturn map(ResultSet rows) throws SQLException {
        Array reasons = rows.getArray("reasons");
        List<ReviewReturnReason> parsed = new ArrayList<>();
        for (Object wire : (Object[]) reasons.getArray()) {
            parsed.add(ReviewReturnReason.fromWire(wire.toString()));
        }
        return new ReviewReturn(rows.getObject("id", UUID.class), rows.getObject("project_id", UUID.class),
                rows.getObject("card_id", UUID.class), rows.getTimestamp("returned_at").toInstant(),
                OfficiumJson.readActor(rows.getString("actor")), rows.getString("role"),
                Status.fromWire(rows.getString("from_status")), Status.fromWire(rows.getString("to_status")),
                parsed, rows.getObject("comment_id", UUID.class));
    }
}
