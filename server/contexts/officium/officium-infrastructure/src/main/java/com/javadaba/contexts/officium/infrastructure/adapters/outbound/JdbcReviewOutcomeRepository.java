package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.javadaba.contexts.officium.domain.QualityDimension;
import com.javadaba.contexts.officium.domain.QualityRule;
import com.javadaba.contexts.officium.domain.ReviewOutcome;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.ReviewOutcomeRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** The review-outcome log (card://JAVA-1526), {@code officium_card_review_outcome}. */
@ApplicationScoped
public class JdbcReviewOutcomeRepository implements ReviewOutcomeRepository {

    /** Tree reads and writes only: nothing here deserializes by reflection (invariant 8). */
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final String SELECT = "select id, project_id, card_id, reviewed_at, actor, role, from_status, "
            + "to_status, verdict, rule_violations, scorecard, observations, review_return_id "
            + "from officium_card_review_outcome ";

    private static final String INSERT = "insert into officium_card_review_outcome (id, project_id, card_id, "
            + "reviewed_at, actor, role, from_status, to_status, verdict, rule_violations, scorecard, observations, "
            + "review_return_id) values (?, ?, ?, ?, cast(? as jsonb), ?, ?, ?, ?, cast(? as text[]), "
            + "cast(? as jsonb), ?, ?)";

    private final DataSource dataSource;

    public JdbcReviewOutcomeRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void insert(ReviewOutcome outcome) {
        ObjectNode scorecard = MAPPER.createObjectNode();
        outcome.scorecard().forEach((dimension, score) -> scorecard.put(dimension.wire(), score.wire()));
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(INSERT)) {
            statement.setObject(1, outcome.id());
            statement.setObject(2, outcome.projectId());
            statement.setObject(3, outcome.cardId());
            statement.setTimestamp(4, Timestamp.from(outcome.at()));
            statement.setString(5, OfficiumJson.writeActor(outcome.actor()));
            statement.setString(6, outcome.role());
            statement.setString(7, outcome.from().wire());
            statement.setString(8, outcome.to().wire());
            statement.setString(9, outcome.verdict().wire());
            // Rule ids are lowercase words, underscores, a colon and hyphens: an array literal needs no escaping.
            statement.setString(10, "{" + String.join(",", QualityRule.ids(outcome.ruleViolations())) + "}");
            statement.setString(11, scorecard.toString());
            statement.setString(12, outcome.observations());
            statement.setObject(13, outcome.reviewReturnId());
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to record a review outcome", ex);
        }
    }

    @Override
    public Map<UUID, List<ReviewOutcome>> listByCards(Collection<UUID> cardIds) {
        Map<UUID, List<ReviewOutcome>> byCard = new LinkedHashMap<>();
        if (cardIds.isEmpty()) {
            return byCard;
        }
        query(SELECT + "where card_id = any (?) order by reviewed_at, id",
                (connection, statement) -> statement.setArray(1, connection.createArrayOf("uuid", cardIds.toArray())))
                .forEach(outcome -> byCard.computeIfAbsent(outcome.cardId(), id -> new ArrayList<>()).add(outcome));
        return byCard;
    }

    @Override
    public List<ReviewOutcome> listByProjectBetween(UUID projectId, java.time.Instant from, java.time.Instant to) {
        return query(SELECT + "where project_id = ? and reviewed_at >= ? and reviewed_at < ? order by reviewed_at, id",
                (connection, statement) -> {
                    statement.setObject(1, projectId);
                    statement.setTimestamp(2, Timestamp.from(from));
                    statement.setTimestamp(3, Timestamp.from(to));
                });
    }

    @Override
    public List<ReviewOutcome> listByProject(UUID projectId) {
        return query(SELECT + "where project_id = ? order by reviewed_at, id",
                (connection, statement) -> statement.setObject(1, projectId));
    }

    private interface Binder {
        void bind(Connection connection, PreparedStatement statement) throws SQLException;
    }

    private List<ReviewOutcome> query(String sql, Binder binder) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            binder.bind(connection, statement);
            try (ResultSet rows = statement.executeQuery()) {
                List<ReviewOutcome> result = new ArrayList<>();
                while (rows.next()) {
                    result.add(map(rows));
                }
                return result;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read review outcomes", ex);
        }
    }

    private static ReviewOutcome map(ResultSet rows) throws SQLException {
        List<String> ids = Arrays.stream((Object[]) rows.getArray("rule_violations").getArray())
                .map(Object::toString).toList();
        Map<QualityDimension, ReviewOutcome.Score> scorecard = new EnumMap<>(QualityDimension.class);
        try {
            JsonNode node = MAPPER.readTree(rows.getString("scorecard"));
            node.fields().forEachRemaining(field -> QualityDimension.find(field.getKey())
                    .ifPresent(dimension -> ReviewOutcome.Score.find(field.getValue().asText())
                            .ifPresent(score -> scorecard.put(dimension, score))));
        } catch (java.io.IOException unreadable) {
            throw new IllegalStateException("Unreadable review scorecard", unreadable);
        }
        return new ReviewOutcome(rows.getObject("id", UUID.class), rows.getObject("project_id", UUID.class),
                rows.getObject("card_id", UUID.class), rows.getTimestamp("reviewed_at").toInstant(),
                OfficiumJson.readActor(rows.getString("actor")), rows.getString("role"),
                Status.fromWire(rows.getString("from_status")), Status.fromWire(rows.getString("to_status")),
                ReviewOutcome.Verdict.fromWire(rows.getString("verdict")), QualityRule.parseAll(ids), scorecard,
                rows.getString("observations"), rows.getObject("review_return_id", UUID.class));
    }
}
