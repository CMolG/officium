package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.ExecutionMode;
import com.javadaba.contexts.officium.domain.ports.ExecutionModeRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** One row per project (card://JAVA-1878, changeset 063), replaced under its version like the integration gate. */
@ApplicationScoped
public class JdbcExecutionModeRepository implements ExecutionModeRepository {

    private final DataSource dataSource;

    public JdbcExecutionModeRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Optional<Stored> find(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select mode, implementer_role, version, updated_at, updated_by "
                                + "from officium_project_execution_mode where project_id = ?")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return Optional.empty();
                }
                Actor updatedBy = rs.getString(5) == null ? null : PrecedenceWire.readActor(rs.getString(5));
                return Optional.of(new Stored(new ExecutionMode(ExecutionMode.Mode.fromWire(rs.getString(1)),
                        rs.getString(2)), rs.getInt(3), rs.getTimestamp(4).toInstant(), updatedBy));
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the execution mode of " + projectId, ex);
        }
    }

    @Override
    public boolean saveIfVersion(UUID projectId, ExecutionMode mode, Actor updatedBy, int expectedVersion,
            Instant at) {
        String sql = expectedVersion == 0
                ? "insert into officium_project_execution_mode (mode, implementer_role, version, updated_at, "
                        + "updated_by, project_id) values (?, ?, 1, ?, cast(? as jsonb), ?) "
                        + "on conflict (project_id) do nothing"
                : "update officium_project_execution_mode set mode = ?, implementer_role = ?, version = version + 1, "
                        + "updated_at = ?, updated_by = cast(? as jsonb) where project_id = ? and version = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, mode.mode().wire());
            statement.setString(2, mode.implementerRole());
            statement.setTimestamp(3, Timestamp.from(at));
            statement.setString(4, PrecedenceWire.actor(updatedBy));
            statement.setObject(5, projectId);
            if (expectedVersion != 0) {
                statement.setInt(6, expectedVersion);
            }
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the execution mode of " + projectId, ex);
        }
    }
}
