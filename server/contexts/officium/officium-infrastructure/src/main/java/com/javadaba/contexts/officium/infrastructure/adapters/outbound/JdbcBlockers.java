package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Status;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import javax.sql.DataSource;

/** The live cards with a {@code blocks} edge into each of a list of cards, with their status, in one read. */
final class JdbcBlockers {

    private static final String SQL = "select l.target_card_id, b.id, b.status from officium_card_link l "
            + "join officium_card b on b.id = l.source_card_id "
            + "where l.type = 'BLOCKS' and l.target_card_id = any (?) and b.deleted_at is null";

    private JdbcBlockers() {
    }

    /** Every asked card has an entry, empty when nothing blocks it. */
    static Map<UUID, Map<UUID, Status>> statusByCard(DataSource dataSource, Collection<UUID> cardIds) {
        Map<UUID, Map<UUID, Status>> result = new LinkedHashMap<>();
        cardIds.forEach(id -> result.put(id, new LinkedHashMap<>()));
        if (cardIds.isEmpty()) {
            return result;
        }
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(SQL)) {
            statement.setArray(1, connection.createArrayOf("uuid", cardIds.toArray()));
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.get(rs.getObject("target_card_id", UUID.class))
                            .put(rs.getObject("id", UUID.class), Status.fromWire(rs.getString("status")));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read blockers for " + cardIds.size() + " cards", ex);
        }
        return result;
    }
}
