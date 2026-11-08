package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.PrecedenceRule;
import com.javadaba.contexts.officium.domain.ports.PrecedenceRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** The rules column is the JSON of {@link PrecedenceWire}; one row per project (JAVA-1686, changeset 053). */
@ApplicationScoped
public class JdbcPrecedenceRepository implements PrecedenceRepository {

    private final DataSource dataSource;

    public JdbcPrecedenceRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Optional<Stored> find(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select rules, version, updated_at, updated_by from officium_project_precedence "
                                + "where project_id = ?")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return Optional.empty();
                }
                List<PrecedenceRule> rules = PrecedenceWire.readRules(rs.getString(1));
                Actor updatedBy = rs.getString(4) == null ? null : PrecedenceWire.readActor(rs.getString(4));
                return Optional.of(new Stored(rules, rs.getInt(2), rs.getTimestamp(3).toInstant(), updatedBy));
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the precedence rules of " + projectId, ex);
        }
    }

    @Override
    public boolean saveIfVersion(UUID projectId, List<PrecedenceRule> rules, Actor updatedBy, int expectedVersion,
            Instant at) {
        String sql = expectedVersion == 0
                ? "insert into officium_project_precedence (rules, version, updated_at, updated_by, project_id) "
                        + "values (cast(? as jsonb), 1, ?, cast(? as jsonb), ?) on conflict (project_id) do nothing"
                : "update officium_project_precedence set rules = cast(? as jsonb), version = version + 1, "
                        + "updated_at = ?, updated_by = cast(? as jsonb) where project_id = ? and version = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, PrecedenceWire.rules(rules));
            statement.setTimestamp(2, Timestamp.from(at));
            statement.setString(3, PrecedenceWire.actor(updatedBy));
            statement.setObject(4, projectId);
            if (expectedVersion != 0) {
                statement.setInt(5, expectedVersion);
            }
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the precedence rules of " + projectId, ex);
        }
    }
}
