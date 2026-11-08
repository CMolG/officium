package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.contexts.officium.domain.ports.RoleMatrixRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** The overrides column is {@link RoleMatrix#toWire()}, read back through the tree model (see {@link OfficiumJson}). */
@ApplicationScoped
public class JdbcRoleMatrixRepository implements RoleMatrixRepository {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final DataSource dataSource;

    public JdbcRoleMatrixRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Optional<Stored> find(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select overrides, version, updated_at from officium_project_role_matrix where project_id = ?")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return Optional.empty();
                }
                return Optional.of(new Stored(read(rs.getString(1)), rs.getInt(2), rs.getTimestamp(3).toInstant()));
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the role matrix of " + projectId, ex);
        }
    }

    @Override
    public boolean saveIfVersion(UUID projectId, RoleMatrix overrides, int expectedVersion, Instant at) {
        String sql = expectedVersion == 0
                ? "insert into officium_project_role_matrix (overrides, version, updated_at, project_id) "
                        + "values (cast(? as jsonb), 1, ?, ?) on conflict (project_id) do nothing"
                : "update officium_project_role_matrix set overrides = cast(? as jsonb), version = version + 1, "
                        + "updated_at = ? where project_id = ? and version = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, write(overrides));
            statement.setTimestamp(2, Timestamp.from(at));
            statement.setObject(3, projectId);
            if (expectedVersion != 0) {
                statement.setInt(4, expectedVersion);
            }
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the role matrix of " + projectId, ex);
        }
    }

    /** The overrides column as JSON; also what a work profile stores (card://JAVA-1524). */
    static String write(RoleMatrix matrix) {
        try {
            return MAPPER.writeValueAsString(matrix.toWire());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to write a role matrix", ex);
        }
    }

    static RoleMatrix read(String json) {
        try {
            JsonNode node = MAPPER.readTree(json);
            // A row written before JAVA-915 has no runs: it overrides no model or effort.
            Map<String, Map<String, Object>> runs = node.has("runs")
                    ? MAPPER.convertValue(node.get("runs"), new TypeReference<>() {
                    })
                    : null;
            return RoleMatrix.fromWire(rows(node.path("categories")), rows(node.path("signals")), runs,
                    node.has("mods") ? rows(node.path("mods")) : null);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unreadable role matrix", ex);
        }
    }

    private static Map<String, Map<String, List<String>>> rows(JsonNode node) {
        Map<String, Map<String, List<String>>> rows = new LinkedHashMap<>();
        node.fields().forEachRemaining(row -> {
            Map<String, List<String>> cells = new LinkedHashMap<>();
            row.getValue().fields().forEachRemaining(cell -> {
                List<String> roles = new ArrayList<>();
                cell.getValue().forEach(role -> roles.add(role.asText()));
                cells.put(cell.getKey(), roles);
            });
            rows.put(row.getKey(), cells);
        });
        return rows;
    }
}
