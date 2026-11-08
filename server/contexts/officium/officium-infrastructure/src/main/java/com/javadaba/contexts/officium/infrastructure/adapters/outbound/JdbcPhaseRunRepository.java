package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.ActorKind;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.PhaseRun;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.PhaseRunRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** The phase-run log (card://JAVA-1527), {@code officium_card_phase_run}. */
@ApplicationScoped
public class JdbcPhaseRunRepository implements PhaseRunRepository {

    private static final String INSERT = "insert into officium_card_phase_run (id, project_id, card_id, ran_at, "
            + "actor_kind, from_status, to_status, category, profile_id, role, model, effort) "
            + "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    private static final String COLUMNS = "select id, project_id, card_id, ran_at, actor_kind, from_status, to_status, "
            + "category, profile_id, role, model, effort from officium_card_phase_run ";
    private static final String SELECT = COLUMNS + "where project_id = ? order by ran_at, id";
    private static final String BY_CARDS = COLUMNS + "where card_id = any (?) order by ran_at, id";

    private final DataSource dataSource;

    public JdbcPhaseRunRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void insert(PhaseRun run) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(INSERT)) {
            statement.setObject(1, run.id());
            statement.setObject(2, run.projectId());
            statement.setObject(3, run.cardId());
            statement.setTimestamp(4, Timestamp.from(run.at()));
            statement.setString(5, run.actorKind().name().toLowerCase(Locale.ROOT));
            statement.setString(6, run.from().wire());
            statement.setString(7, run.to().wire());
            statement.setString(8, run.category() == null ? null : run.category().wire());
            statement.setString(9, run.profileId());
            statement.setString(10, run.role());
            statement.setString(11, run.model());
            statement.setString(12, run.effort());
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to record a phase run", ex);
        }
    }

    @Override
    public List<PhaseRun> listByCards(java.util.Collection<UUID> cardIds) {
        if (cardIds.isEmpty()) {
            return List.of();
        }
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(BY_CARDS)) {
            statement.setArray(1, connection.createArrayOf("uuid", cardIds.toArray()));
            return read(statement);
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read phase runs", ex);
        }
    }

    @Override
    public List<PhaseRun> listByProject(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(SELECT)) {
            statement.setObject(1, projectId);
            return read(statement);
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read phase runs", ex);
        }
    }

    private static List<PhaseRun> read(PreparedStatement statement) throws SQLException {
        try (ResultSet rows = statement.executeQuery()) {
            List<PhaseRun> result = new ArrayList<>();
            while (rows.next()) {
                String category = rows.getString("category");
                result.add(new PhaseRun(rows.getObject("id", UUID.class), rows.getObject("project_id", UUID.class),
                        rows.getObject("card_id", UUID.class), rows.getTimestamp("ran_at").toInstant(),
                        ActorKind.valueOf(rows.getString("actor_kind").toUpperCase(Locale.ROOT)),
                        Status.fromWire(rows.getString("from_status")),
                        Status.fromWire(rows.getString("to_status")),
                        category == null ? null : Category.fromWire(category), rows.getString("profile_id"),
                        rows.getString("role"), rows.getString("model"), rows.getString("effort")));
            }
            return result;
        }
    }
}
