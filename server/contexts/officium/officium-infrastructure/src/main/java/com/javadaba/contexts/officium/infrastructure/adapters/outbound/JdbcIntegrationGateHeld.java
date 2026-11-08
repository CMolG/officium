package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;

/**
 * Whether a project's gate holds the cards that wait on a card in Deploy (JAVA-1820): {@code cards.next} then counts
 * a Deploy blocker as unfinished. A project with no row, or with the rule off, keeps today's statements.
 */
final class JdbcIntegrationGateHeld {

    private JdbcIntegrationGateHeld() {
    }

    static boolean enabled(DataSource dataSource, UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select coalesce((rules -> 'heldByDeploy' ->> 'enabled') = 'true', false) "
                                + "from officium_project_integration_gate where project_id = ?")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() && rs.getBoolean(1);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the integration gate of " + projectId, ex);
        }
    }
}
