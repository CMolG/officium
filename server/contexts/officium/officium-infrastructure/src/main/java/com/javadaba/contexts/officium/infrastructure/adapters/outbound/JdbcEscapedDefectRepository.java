package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.EscapedDefect;
import com.javadaba.contexts.officium.domain.EscapedPhase;
import com.javadaba.contexts.officium.domain.QualityDimension;
import com.javadaba.contexts.officium.domain.QualityRule;
import com.javadaba.contexts.officium.domain.ports.EscapedDefectRepository;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** The escaped-defect log (card://JAVA-1525), {@code officium_card_escaped_defect}. */
@ApplicationScoped
public class JdbcEscapedDefectRepository implements EscapedDefectRepository {

    private static final String SELECT = "select id, project_id, origin_card_id, corrective_card_id, corrective_key, "
            + "recorded_at, actor, escaped_in, quality_dimension, rules from officium_card_escaped_defect ";

    private static final String INSERT = "insert into officium_card_escaped_defect (id, project_id, origin_card_id, "
            + "corrective_card_id, corrective_key, recorded_at, actor, escaped_in, quality_dimension, rules) "
            + "values (?, ?, ?, ?, ?, ?, cast(? as jsonb), ?, ?, cast(? as text[])) "
            + "on conflict (origin_card_id, corrective_card_id) do nothing";

    private final DataSource dataSource;

    public JdbcEscapedDefectRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public boolean recordIfAbsent(EscapedDefect defect) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(INSERT)) {
            statement.setObject(1, defect.id());
            statement.setObject(2, defect.projectId());
            statement.setObject(3, defect.originCardId());
            statement.setObject(4, defect.correctiveCardId());
            statement.setString(5, defect.correctiveKey());
            statement.setTimestamp(6, Timestamp.from(defect.at()));
            statement.setString(7, OfficiumJson.writeActor(defect.actor()));
            statement.setString(8, defect.escapedIn().wire());
            statement.setString(9, defect.dimension().wire());
            // Rule ids are lowercase words, underscores, a colon and hyphens: an array literal needs no escaping.
            statement.setString(10, "{" + String.join(",", QualityRule.ids(defect.rules())) + "}");
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to record an escaped defect", ex);
        }
    }

    @Override
    public Map<UUID, List<EscapedDefect>> listByOrigins(Collection<UUID> originCardIds) {
        Map<UUID, List<EscapedDefect>> byOrigin = new LinkedHashMap<>();
        if (originCardIds.isEmpty()) {
            return byOrigin;
        }
        query(SELECT + "where origin_card_id = any (?) order by recorded_at, id",
                (connection, statement) -> statement.setArray(1,
                        connection.createArrayOf("uuid", originCardIds.toArray())))
                .forEach(entry -> byOrigin.computeIfAbsent(entry.originCardId(), id -> new ArrayList<>()).add(entry));
        return byOrigin;
    }

    @Override
    public List<EscapedDefect> listByProject(UUID projectId) {
        return query(SELECT + "where project_id = ? order by recorded_at, id",
                (connection, statement) -> statement.setObject(1, projectId));
    }

    private interface Binder {
        void bind(Connection connection, PreparedStatement statement) throws SQLException;
    }

    private List<EscapedDefect> query(String sql, Binder binder) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            binder.bind(connection, statement);
            try (ResultSet rows = statement.executeQuery()) {
                List<EscapedDefect> result = new ArrayList<>();
                while (rows.next()) {
                    result.add(map(rows));
                }
                return result;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read escaped defects", ex);
        }
    }

    private static EscapedDefect map(ResultSet rows) throws SQLException {
        List<String> ids = Arrays.stream((Object[]) rows.getArray("rules").getArray()).map(Object::toString).toList();
        return new EscapedDefect(rows.getObject("id", UUID.class), rows.getObject("project_id", UUID.class),
                rows.getObject("origin_card_id", UUID.class), rows.getObject("corrective_card_id", UUID.class),
                rows.getString("corrective_key"), rows.getTimestamp("recorded_at").toInstant(),
                OfficiumJson.readActor(rows.getString("actor")),
                EscapedPhase.find(rows.getString("escaped_in")).orElseThrow(),
                QualityDimension.fromWire(rows.getString("quality_dimension")), QualityRule.parseAll(ids));
    }
}
