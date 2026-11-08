package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.IntegrationGate;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.ports.IntegrationGateRepository;
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

/**
 * One row per project (JAVA-1820, changeset 061). The rules column is the JSON the REST body carries, read and
 * written through the tree model so no reflective deserialization is needed in a native build.
 */
@ApplicationScoped
public class JdbcIntegrationGateRepository implements IntegrationGateRepository {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final DataSource dataSource;

    public JdbcIntegrationGateRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Optional<Stored> find(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select rules, version, updated_at, updated_by from officium_project_integration_gate "
                                + "where project_id = ?")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return Optional.empty();
                }
                Actor updatedBy = rs.getString(4) == null ? null : PrecedenceWire.readActor(rs.getString(4));
                return Optional.of(new Stored(readRules(rs.getString(1)), rs.getInt(2),
                        rs.getTimestamp(3).toInstant(), updatedBy));
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the integration gate of " + projectId, ex);
        }
    }

    @Override
    public boolean saveIfVersion(UUID projectId, IntegrationGate.Rules rules, Actor updatedBy, int expectedVersion,
            Instant at) {
        String sql = expectedVersion == 0
                ? "insert into officium_project_integration_gate (rules, version, updated_at, updated_by, "
                        + "project_id) values (cast(? as jsonb), 1, ?, cast(? as jsonb), ?) "
                        + "on conflict (project_id) do nothing"
                : "update officium_project_integration_gate set rules = cast(? as jsonb), version = version + 1, "
                        + "updated_at = ?, updated_by = cast(? as jsonb) where project_id = ? and version = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, writeRules(rules));
            statement.setTimestamp(2, Timestamp.from(at));
            statement.setString(3, PrecedenceWire.actor(updatedBy));
            statement.setObject(4, projectId);
            if (expectedVersion != 0) {
                statement.setInt(5, expectedVersion);
            }
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the integration gate of " + projectId, ex);
        }
    }

    static String writeRules(IntegrationGate.Rules rules) {
        ObjectNode node = MAPPER.createObjectNode();
        node.putObject("heldByDeploy").put("enabled", rules.heldByDeploy().enabled()).put("minPriority",
                rules.heldByDeploy().minPriority().wire());
        node.putObject("deployQueue").put("enabled", rules.deployQueue().enabled()).put("max",
                rules.deployQueue().max());
        node.putObject("nothingElse").put("enabled", rules.nothingElse().enabled());
        try {
            return MAPPER.writeValueAsString(node);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to write the integration gate", ex);
        }
    }

    static IntegrationGate.Rules readRules(String json) {
        try {
            JsonNode node = MAPPER.readTree(json);
            JsonNode held = node.path("heldByDeploy");
            JsonNode queue = node.path("deployQueue");
            return new IntegrationGate.Rules(
                    new IntegrationGate.HeldByDeploy(held.path("enabled").asBoolean(false),
                            Priority.fromWire(held.path("minPriority").asText("high"))),
                    new IntegrationGate.DeployQueue(queue.path("enabled").asBoolean(false),
                            queue.path("max").asInt(5)),
                    new IntegrationGate.NothingElse(node.path("nothingElse").path("enabled").asBoolean(false)));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unreadable integration gate", ex);
        }
    }
}
