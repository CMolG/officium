package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.SuiteTrend;
import com.javadaba.contexts.officium.domain.TestRun;
import com.javadaba.contexts.officium.domain.ports.TestRunRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JdbcTestRunRepository implements TestRunRepository {

    private static final String SELECT_RUN = "select id, project_id, ref, branch, machine, started_at, finished_at, "
            + "slots, jobs, workers, recorded_by, recorded_at from officium_test_run";

    private final DataSource dataSource;

    public JdbcTestRunRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public boolean insert(TestRun run) {
        String insertRun = "insert into officium_test_run (id, project_id, ref, branch, machine, started_at, "
                + "finished_at, slots, jobs, workers, recorded_by, recorded_at) "
                + "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, cast(? as jsonb), ?)";
        String insertSuite = "insert into officium_test_suite_result (run_id, position, name, ok, seconds) "
                + "values (?, ?, ?, ?, ?)";
        try (Connection connection = dataSource.getConnection()) {
            boolean autoCommit = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try (PreparedStatement runStatement = connection.prepareStatement(insertRun);
                    PreparedStatement suiteStatement = connection.prepareStatement(insertSuite)) {
                runStatement.setObject(1, run.id());
                runStatement.setObject(2, run.projectId());
                runStatement.setString(3, run.ref());
                runStatement.setString(4, run.branch());
                runStatement.setString(5, run.machine());
                runStatement.setTimestamp(6, Timestamp.from(run.startedAt()));
                runStatement.setTimestamp(7, run.finishedAt() == null ? null : Timestamp.from(run.finishedAt()));
                runStatement.setObject(8, run.budget().slots(), Types.INTEGER);
                runStatement.setObject(9, run.budget().jobs(), Types.INTEGER);
                runStatement.setObject(10, run.budget().workers(), Types.INTEGER);
                runStatement.setString(11, OfficiumJson.writeActor(run.recordedBy()));
                runStatement.setTimestamp(12, Timestamp.from(run.recordedAt()));
                runStatement.executeUpdate();
                int position = 0;
                for (TestRun.SuiteResult suite : run.suites()) {
                    suiteStatement.setObject(1, run.id());
                    suiteStatement.setInt(2, position++);
                    suiteStatement.setString(3, suite.name());
                    suiteStatement.setBoolean(4, suite.ok());
                    suiteStatement.setDouble(5, suite.seconds());
                    suiteStatement.addBatch();
                }
                suiteStatement.executeBatch();
                connection.commit();
                return true;
            } catch (SQLException ex) {
                connection.rollback();
                // uq_officium_test_run_key: the same run was recorded in between.
                if ("23505".equals(ex.getSQLState())) {
                    return false;
                }
                throw ex;
            } finally {
                connection.setAutoCommit(autoCommit);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to record test run " + run.ref(), ex);
        }
    }

    @Override
    public Optional<TestRun> find(UUID projectId, String machine, Instant startedAt) {
        String sql = SELECT_RUN + " where project_id = ? and machine = ? and started_at = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            statement.setString(2, machine);
            statement.setTimestamp(3, Timestamp.from(startedAt));
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return Optional.empty();
                }
                TestRun header = map(rs, List.of());
                return Optional.of(withSuites(connection, List.of(header)).get(0));
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read a test run of " + projectId, ex);
        }
    }

    @Override
    public List<TestRun> list(UUID projectId, int limit) {
        String sql = SELECT_RUN + " where project_id = ? order by started_at desc limit ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            statement.setInt(2, limit);
            List<TestRun> headers = new ArrayList<>();
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    headers.add(map(rs, List.of()));
                }
            }
            return withSuites(connection, headers);
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the test runs of " + projectId, ex);
        }
    }

    @Override
    public Map<String, List<SuiteTrend.Point>> series(UUID projectId, int points) {
        // The project's last `points` runs, then every suite result in them, newest run first.
        String sql = "with recent as (select id, ref, started_at, machine, slots, jobs, workers from officium_test_run "
                + "where project_id = ? order by started_at desc limit ?) "
                + "select s.name, r.ref, r.started_at, s.ok, s.seconds, r.machine, r.slots, r.jobs, r.workers "
                + "from recent r "
                + "join officium_test_suite_result s on s.run_id = r.id order by r.started_at desc, s.position";
        Map<String, List<SuiteTrend.Point>> result = new LinkedHashMap<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            statement.setInt(2, points);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.computeIfAbsent(rs.getString("name"), name -> new ArrayList<>())
                            .add(new SuiteTrend.Point(rs.getString("ref"), rs.getTimestamp("started_at").toInstant(),
                                    rs.getBoolean("ok"), rs.getDouble("seconds"), rs.getString("machine"),
                                    rs.getObject("slots", Integer.class), rs.getObject("jobs", Integer.class),
                                    rs.getObject("workers", Integer.class)));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the suite series of " + projectId, ex);
        }
        return result;
    }

    private static List<TestRun> withSuites(Connection connection, List<TestRun> headers) throws SQLException {
        if (headers.isEmpty()) {
            return headers;
        }
        Map<UUID, List<TestRun.SuiteResult>> suites = new LinkedHashMap<>();
        headers.forEach(run -> suites.put(run.id(), new ArrayList<>()));
        try (PreparedStatement statement = connection.prepareStatement(
                "select run_id, name, ok, seconds from officium_test_suite_result where run_id = any(?) "
                        + "order by run_id, position")) {
            statement.setArray(1, connection.createArrayOf("uuid", suites.keySet().toArray()));
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    suites.get(rs.getObject("run_id", UUID.class)).add(new TestRun.SuiteResult(rs.getString("name"),
                            rs.getBoolean("ok"), rs.getDouble("seconds")));
                }
            }
        }
        return headers.stream()
                .map(run -> new TestRun(run.id(), run.projectId(), run.ref(), run.branch(), run.machine(),
                        run.startedAt(), run.finishedAt(), run.budget(), suites.get(run.id()), run.recordedBy(),
                        run.recordedAt()))
                .toList();
    }

    private static TestRun map(ResultSet rs, List<TestRun.SuiteResult> suites) throws SQLException {
        Timestamp finishedAt = rs.getTimestamp("finished_at");
        return new TestRun(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class), rs.getString("ref"),
                rs.getString("branch"), rs.getString("machine"), rs.getTimestamp("started_at").toInstant(),
                finishedAt == null ? null : finishedAt.toInstant(),
                new TestRun.Budget(rs.getObject("slots", Integer.class), rs.getObject("jobs", Integer.class),
                        rs.getObject("workers", Integer.class)),
                suites,
                OfficiumJson.readActor(rs.getString("recorded_by")), rs.getTimestamp("recorded_at").toInstant());
    }
}
