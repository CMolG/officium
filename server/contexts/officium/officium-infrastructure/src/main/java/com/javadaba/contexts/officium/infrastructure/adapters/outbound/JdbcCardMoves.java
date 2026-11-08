package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.CardRejection;
import com.javadaba.contexts.officium.domain.SendBack;
import com.javadaba.contexts.officium.domain.Status;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * The transaction of {@code CardRepository#moveIfVersion}: the card's status and order, both columns renumbered,
 * and a send-back's findings comment and log entry (card://JAVA-1416), all or nothing.
 */
final class JdbcCardMoves {

    private JdbcCardMoves() {
    }

    static boolean move(DataSource dataSource, UUID projectId, UUID cardId, int expectedVersion, Status newStatus,
            Map<UUID, Integer> sourceColumnOrder, Map<UUID, Integer> destColumnOrder, Instant now,
            CardRejection rejection, SendBack sendBack) {
        Integer newOrder = destColumnOrder.get(cardId);
        if (newOrder == null) {
            throw new IllegalArgumentException("destColumnOrder must contain the moving card");
        }
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                boolean moved = updateStatusAndOrder(connection, projectId, cardId, expectedVersion, newStatus,
                        newOrder, now, rejection);
                if (!moved) {
                    connection.rollback();
                    return false;
                }
                Set<UUID> touched = new LinkedHashSet<>();
                touched.add(cardId);
                for (Map<UUID, Integer> column : java.util.List.of(sourceColumnOrder, destColumnOrder)) {
                    for (Map.Entry<UUID, Integer> entry : column.entrySet()) {
                        if (touched.add(entry.getKey())) {
                            updateOrderOnly(connection, entry.getKey(), entry.getValue());
                        }
                    }
                }
                if (sendBack != null) {
                    JdbcSendBackWrites.write(connection, sendBack);
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
            throw new IllegalStateException("Unable to move card " + cardId, ex);
        }
    }

    private static boolean updateStatusAndOrder(Connection connection, UUID projectId, UUID cardId,
            int expectedVersion, Status newStatus, int newOrder, Instant now, CardRejection rejection)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "update officium_card set status = ?, card_order = ?, version = version + 1, updated_at = ?, "
                        + "rejection_reason = ?, rejection_note = ?, rejection_card_id = ? "
                        + "where id = ? and project_id = ? and version = ? and deleted_at is null")) {
            statement.setString(1, newStatus.wire());
            statement.setInt(2, newOrder);
            statement.setTimestamp(3, Timestamp.from(now));
            CardRows.bindRejection(statement, 4, rejection);
            statement.setObject(7, cardId);
            statement.setObject(8, projectId);
            statement.setInt(9, expectedVersion);
            return statement.executeUpdate() == 1;
        }
    }

    private static void updateOrderOnly(Connection connection, UUID cardId, int order) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "update officium_card set card_order = ? where id = ?")) {
            statement.setInt(1, order);
            statement.setObject(2, cardId);
            statement.executeUpdate();
        }
    }
}
