package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.IntegrationGateEvaluation.Held;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.ports.IntegrationGateFacts;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** The gate's reads (JAVA-1820): the held cards, the Deploy cards and the walls, each one statement. */
@ApplicationScoped
public class JdbcIntegrationGateFacts implements IntegrationGateFacts {

    /**
     * A Deploy card {@code k} waiting on a merge: an open link to a branch. A card with no commit on any branch (an
     * epic, a routine, a live check) or one whose pull request merged waits on no merge, and a gate asking for one
     * would never clear (JAVA-1880).
     */
    private static final String ON_BRANCH = "exists (select 1 from officium_card_dev_link d where d.card_id = k.id "
            + "and d.kind = 'branch' and d.state = 'open')";

    /** An open agent card of the active sprint with at least one blocker in Deploy, with those blockers' keys. */
    private static final String HELD = "select c.key, c.priority, array_agg(k.key order by k.number) "
            + "from officium_card c join officium_card_link l on l.target_card_id = c.id and l.type = 'BLOCKS' "
            + "join officium_card k on k.id = l.source_card_id and k.status = 'deploy' and k.deleted_at is null "
            + "and " + ON_BRANCH + " "
            + "where c.project_id = ? and c.deleted_at is null and c.executor = 'ai' "
            + "and c.category is distinct from 'epic' and c.status in " + JdbcCardRepository.NEXT_PHASES + " "
            + "and c.sprint_id = (select s.id from officium_sprint s where s.project_id = c.project_id "
            + "and s.state = 'active') group by c.id, c.key, c.priority, c.number "
            + "order by " + JdbcCardRepository.PRIORITY_RANK_CASE.replace("priority", "c.priority") + ", c.number";

    private static final String DEPLOY = "select k.key from officium_card k where k.project_id = ? "
            + "and k.deleted_at is null and k.status = 'deploy' and " + ON_BRANCH + " order by k.number";

    private static final String WALLS = "select id, key, client_key, version from officium_card "
            + "where project_id = ? and deleted_at is null and client_key like 'integration-gate:%' "
            + "and status not in ('done', 'rejected') order by number";

    private final DataSource dataSource;

    public JdbcIntegrationGateFacts(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<Held> held(UUID projectId) {
        List<Held> held = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(HELD)) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    Array blockers = rs.getArray(3);
                    held.add(new Held(rs.getString(1), Priority.fromWire(rs.getString(2)),
                            List.of((String[]) blockers.getArray())));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the held cards of " + projectId, ex);
        }
        return held;
    }

    @Override
    public List<String> deployKeys(UUID projectId) {
        List<String> keys = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(DEPLOY)) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    keys.add(rs.getString(1));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the Deploy cards of " + projectId, ex);
        }
        return keys;
    }

    @Override
    public List<OpenWall> openWalls(UUID projectId) {
        List<OpenWall> walls = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(WALLS)) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    walls.add(new OpenWall(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3),
                            rs.getInt(4)));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the gate walls of " + projectId, ex);
        }
        return walls;
    }
}
