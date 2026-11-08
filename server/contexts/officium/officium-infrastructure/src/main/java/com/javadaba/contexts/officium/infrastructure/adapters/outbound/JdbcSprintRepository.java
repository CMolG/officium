package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Sprint;
import com.javadaba.contexts.officium.domain.SprintState;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.SprintRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class JdbcSprintRepository implements SprintRepository {

    private static final String COLUMNS = "id, project_id, number, name, goal, state, start_date, end_date, "
            + "started_at, closed_at, sprint_order, version, created_at, updated_at";

    private static final String SELECT = "select " + COLUMNS + " from officium_sprint";

    /** The statuses a sprint's card is no longer open in: finished, or closed (rejected too, card://JAVA-1415). */
    private static final String NOT_OPEN = Arrays.stream(Status.values()).filter(s -> s.finished() || s.closed())
            .map(s -> "'" + s.wire() + "'").collect(Collectors.joining(", ", "(", ")"));

    private final DataSource dataSource;

    public JdbcSprintRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Sprint insert(Sprint sprint) {
        String sql = "insert into officium_sprint (" + COLUMNS + ") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, sprint.id());
            statement.setObject(2, sprint.projectId());
            statement.setInt(3, sprint.number());
            bindMutable(statement, 4, sprint);
            statement.setTimestamp(13, Timestamp.from(sprint.createdAt()));
            statement.setTimestamp(14, Timestamp.from(sprint.updatedAt()));
            statement.executeUpdate();
            return sprint;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert sprint", ex);
        }
    }

    /** name, goal, state, start_date, end_date, started_at, closed_at, sprint_order, version -- in that order. */
    private static void bindMutable(PreparedStatement statement, int first, Sprint sprint) throws SQLException {
        statement.setString(first, sprint.name());
        statement.setString(first + 1, sprint.goal());
        statement.setString(first + 2, sprint.state().wire());
        statement.setDate(first + 3, date(sprint.startDate()));
        statement.setDate(first + 4, date(sprint.endDate()));
        statement.setTimestamp(first + 5, timestamp(sprint.startedAt()));
        statement.setTimestamp(first + 6, timestamp(sprint.closedAt()));
        statement.setInt(first + 7, sprint.order());
        statement.setInt(first + 8, sprint.version());
    }

    @Override
    public Optional<Sprint> findById(UUID projectId, UUID sprintId) {
        return findOne(SELECT + " where project_id = ? and id = ?", projectId, sprintId);
    }

    @Override
    public Optional<Sprint> findActive(UUID projectId) {
        return findOne(SELECT + " where project_id = ? and state = 'active'", projectId, null);
    }

    private Optional<Sprint> findOne(String sql, UUID projectId, UUID sprintId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            if (sprintId != null) {
                statement.setObject(2, sprintId);
            }
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read sprint of " + projectId, ex);
        }
    }

    @Override
    public List<Sprint> listByProject(UUID projectId) {
        List<Sprint> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(SELECT + " where project_id = ?")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list sprints of " + projectId, ex);
        }
        return result;
    }

    @Override
    public int nextNumber(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select coalesce(max(number), 0) + 1 from officium_sprint where project_id = ?")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to number a sprint of " + projectId, ex);
        }
    }

    @Override
    public boolean updateIfVersion(Sprint updated, int expectedVersion) {
        String sql = "update officium_sprint set name = ?, goal = ?, state = ?, start_date = ?, end_date = ?, "
                + "started_at = ?, closed_at = ?, sprint_order = ?, version = ?, updated_at = ? "
                + "where id = ? and project_id = ? and version = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            bindMutable(statement, 1, updated);
            statement.setTimestamp(10, Timestamp.from(updated.updatedAt()));
            statement.setObject(11, updated.id());
            statement.setObject(12, updated.projectId());
            statement.setInt(13, expectedVersion);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            // uq_officium_sprint_active: another sprint became active in between.
            if ("23505".equals(ex.getSQLState())) {
                return false;
            }
            throw new IllegalStateException("Unable to update sprint " + updated.id(), ex);
        }
    }

    @Override
    public boolean deleteIfVersion(UUID projectId, UUID sprintId, int expectedVersion) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_sprint where id = ? and project_id = ? and version = ?")) {
            statement.setObject(1, sprintId);
            statement.setObject(2, projectId);
            statement.setInt(3, expectedVersion);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to delete sprint " + sprintId, ex);
        }
    }

    @Override
    public Map<UUID, Counts> counts(UUID projectId) {
        Map<UUID, Counts> result = new HashMap<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select sprint_id, count(*) as cards, count(*) filter (where status not in " + NOT_OPEN
                                + ") as open_cards, coalesce(sum(estimate), 0) as estimate from officium_card "
                                + "where project_id = ? and sprint_id is not null and deleted_at is null "
                                + "group by sprint_id")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.put(rs.getObject("sprint_id", UUID.class), new Counts(rs.getInt("cards"),
                            rs.getInt("open_cards"), rs.getDouble("estimate")));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to count the sprints of " + projectId, ex);
        }
        return result;
    }

    private static Date date(LocalDate value) {
        return value == null ? null : Date.valueOf(value);
    }

    private static Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }

    private static Sprint map(ResultSet rs) throws SQLException {
        Date start = rs.getDate("start_date");
        Date end = rs.getDate("end_date");
        Timestamp startedAt = rs.getTimestamp("started_at");
        Timestamp closedAt = rs.getTimestamp("closed_at");
        return new Sprint(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class), rs.getInt("number"),
                rs.getString("name"), rs.getString("goal"), SprintState.fromWire(rs.getString("state")),
                start == null ? null : start.toLocalDate(), end == null ? null : end.toLocalDate(),
                startedAt == null ? null : startedAt.toInstant(), closedAt == null ? null : closedAt.toInstant(),
                rs.getInt("sprint_order"), rs.getInt("version"), rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }
}
