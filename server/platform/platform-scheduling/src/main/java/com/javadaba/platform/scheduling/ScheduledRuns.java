package com.javadaba.platform.scheduling;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.MultiGauge;
import io.quarkus.logging.Log;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Runs a clock-driven job once per slot across every app-api instance (JAVA-476).
 *
 * <p>{@code ConcurrentExecution.SKIP} only guards one JVM: with two instances overlapping during
 * a deploy, every job ran twice. Here the slot is claimed with one statement against
 * {@code scheduled_run}'s {@code unique (job, slot)}, and only the instance that claimed it runs
 * the task. The row is also the history: whether yesterday's run happened is a query, not a log
 * search.
 *
 * <p>A claim holds a lease, renewed by its owner's {@link #heartbeat()}. A run whose owner died
 * stops being renewed, is marked {@code abandoned}, and its slot can be claimed again: by any
 * instance's next tick, or by the owner itself once it restarts. While another run of the same job
 * still holds a live lease, no new slot is claimed, so a run that outlives its interval never
 * overlaps the next one.
 *
 * <p>Daily jobs tick every minute and run once their slot is due: that single mechanism is the
 * daily fire, the catch-up after downtime and the takeover. A daily job with no history at all
 * records a {@code baseline} instead of running, so the deploy that introduces it does not re-run
 * every daily job at boot.
 */
@ApplicationScoped
public class ScheduledRuns {

    static final Duration LEASE = Duration.ofMinutes(5);
    static final Duration RETENTION = Duration.ofDays(30);
    static final String PRUNE_JOB = "scheduled-run-prune";
    private static final int ERROR_LIMIT = 2000;

    private final DataSource dataSource;
    private final Clock clock;
    private final String instance;
    private final Duration lease;
    private final MeterRegistry meters;
    private final MultiGauge runningSince;

    /** Per job, the slot this instance knows is finished, so a tick inside it costs no query. */
    private final Map<String, String> finished = new ConcurrentHashMap<>();
    /** Daily jobs known to have history, so the baseline check runs once per job and JVM. */
    private final Set<String> withHistory = ConcurrentHashMap.newKeySet();
    /** The jobs this JVM runs: a disabled job never calls {@link #run}, so it is never measured. */
    private final Map<String, ScheduledRunMetrics> jobs = new ConcurrentHashMap<>();
    /**
     * The (job, slot) runs this JVM is executing right now: the only rows its heartbeat renews. A
     * row this instance claimed but could not close (the database was down when the task ended)
     * stops being renewed, expires and is taken over, instead of stalling its job until restart.
     */
    private final Set<Run> executing = ConcurrentHashMap.newKeySet();

    @Inject
    public ScheduledRuns(DataSource dataSource, MeterRegistry meters) {
        this(dataSource, Clock.systemUTC(), instanceName(), LEASE, meters);
    }

    /** An instance with its own clock and name: what a test needs to play two app-api instances. */
    public ScheduledRuns(DataSource dataSource, Clock clock, String instance, Duration lease, MeterRegistry meters) {
        this.dataSource = dataSource;
        this.clock = clock;
        this.instance = instance;
        this.lease = lease;
        this.meters = meters;
        this.runningSince = ScheduledRunMetrics.runningSince(meters);
    }

    /**
     * Runs {@code task} if this instance claims the current slot of {@code job}. A task that
     * throws is recorded as {@code failed}, logged and counted; the next slot runs as usual. An
     * {@link Error} is recorded the same way and then rethrown. If the run cannot be closed (the
     * database is unreachable), the exception propagates and the row is left to expire: the slot
     * runs again elsewhere, at least once rather than never.
     *
     * @return whether this instance ran the task
     */
    public boolean run(String job, Cadence cadence, Runnable task) {
        Instant now = clock.instant();
        String slot = cadence.slotAt(now);
        ScheduledRunMetrics metrics = jobs.computeIfAbsent(job,
                name -> new ScheduledRunMetrics(meters, name, cadence, now));
        if (slot.equals(finished.get(job))) {
            return false;
        }
        if (cadence instanceof Cadence.Daily && !withHistory.contains(job)) {
            if (!hasHistory(job)) {
                baseline(job, slot, now);
                finished.put(job, slot);
                return false;
            }
            withHistory.add(job);
        }
        if (!claim(job, slot, now)) {
            if (isFinished(job, slot)) {
                finished.put(job, slot);
            }
            return false;
        }
        Run running = new Run(job, slot);
        executing.add(running);
        Throwable failure = null;
        try {
            try {
                task.run();
            } catch (Throwable t) {
                failure = t;
            }
            if (failure == null) {
                complete(job, slot, "succeeded", null);
            } else {
                metrics.failures.increment();
                Log.errorf(failure, "Scheduled job %s failed in slot %s", job, slot);
                complete(job, slot, "failed", failure.toString());
            }
        } finally {
            executing.remove(running);
            metrics.runs.increment();
        }
        finished.put(job, slot);
        if (failure instanceof Error error) {
            throw error;
        }
        return true;
    }

    /**
     * Keeps alive the leases of the runs this instance is executing, abandons the runs whose owner
     * stopped renewing them, prunes old history once a day and refreshes the metrics. Per instance
     * by nature: every instance renews only its own rows.
     */
    @Scheduled(identity = "scheduled-runs-heartbeat", every = "30s")
    public void heartbeat() {
        Instant now = clock.instant();
        Run[] alive = executing.toArray(Run[]::new);
        if (alive.length > 0) {
            update("""
                    update scheduled_run set lease_until = ?
                     where instance = ? and status = 'running'
                       and (job, slot) in (select * from unnest(?, ?))""",
                    ts(now.plus(lease)), instance,
                    Arrays.stream(alive).map(Run::job).toArray(String[]::new),
                    Arrays.stream(alive).map(Run::slot).toArray(String[]::new));
        }
        int abandoned = update("""
                update scheduled_run
                   set status = 'abandoned', finished_at = ?, lease_until = null,
                       error = 'lease expired: ' || instance || ' stopped renewing it'
                 where status = 'running' and lease_until < ?""", ts(now), ts(now));
        if (abandoned > 0) {
            Log.warnf("%d scheduled run(s) abandoned: their instance stopped renewing the lease", abandoned);
        }
        run(PRUNE_JOB, Cadence.every(Duration.ofDays(1)), () -> prune(now.minus(RETENTION)));
        refreshMetrics();
    }

    /** History older than the retention, except what is still running. */
    public int prune(Instant before) {
        return update("delete from scheduled_run where started_at < ? and status <> 'running'", ts(before));
    }

    private boolean hasHistory(String job) {
        return query("select 1 from scheduled_run where job = ? limit 1", rs -> rs.next(), job);
    }

    private void baseline(String job, String slot, Instant now) {
        update("""
                insert into scheduled_run (job, slot, status, instance, started_at, finished_at)
                values (?, ?, 'baseline', ?, ?, ?)
                on conflict (job, slot) do nothing""", job, slot, instance, ts(now), ts(now));
        withHistory.add(job);
        Log.infof("Scheduled job %s has no history: slot %s recorded as its baseline, it runs from the next one", job,
                slot);
    }

    /**
     * One statement, so two instances racing for the same slot cannot both win: the unique key
     * decides. An existing row is taken over only when it was abandoned or its lease expired.
     */
    private boolean claim(String job, String slot, Instant now) {
        return query("""
                insert into scheduled_run (job, slot, status, instance, started_at, lease_until)
                select ?, ?, 'running', ?, ?, ?
                 where not exists (select 1 from scheduled_run
                                    where job = ? and slot <> ? and status = 'running' and lease_until > ?)
                on conflict (job, slot) do update
                   set status = 'running', instance = excluded.instance, started_at = excluded.started_at,
                       lease_until = excluded.lease_until, finished_at = null, error = null,
                       attempts = scheduled_run.attempts + 1
                 where scheduled_run.status = 'abandoned'
                    or (scheduled_run.status = 'running' and scheduled_run.lease_until <= excluded.started_at)
                returning id""", rs -> rs.next(),
                job, slot, instance, ts(now), ts(now.plus(lease)), job, slot, ts(now));
    }

    /** Only the owner closes its run: a run taken over after its lease expired is not overwritten. */
    private void complete(String job, String slot, String status, String error) {
        int closed = update("""
                update scheduled_run set status = ?, finished_at = ?, lease_until = null, error = ?
                 where job = ? and slot = ? and instance = ? and status = 'running'""",
                status, ts(clock.instant()), truncate(error), job, slot, instance);
        if (closed == 0) {
            Log.warnf("Scheduled job %s finished slot %s after losing its lease; another instance owns it now", job,
                    slot);
        }
    }

    private boolean isFinished(String job, String slot) {
        return query("""
                select 1 from scheduled_run
                 where job = ? and slot = ? and status in ('succeeded', 'failed', 'baseline')""",
                rs -> rs.next(), job, slot);
    }

    private void refreshMetrics() {
        if (jobs.isEmpty()) {
            return;
        }
        ScheduledRunMetrics.publish(runningSince, query("""
                select job, slot, instance, started_at from scheduled_run
                 where status = 'running' and job = any(?)""", rs -> {
            List<ScheduledRunMetrics.Running> running = new ArrayList<>();
            while (rs.next()) {
                running.add(new ScheduledRunMetrics.Running(rs.getString(1), rs.getString(2), rs.getString(3),
                        rs.getTimestamp(4).toInstant()));
            }
            return running;
        }, (Object) jobs.keySet().toArray(String[]::new)));
        query("""
                select j.job, r.started_at, r.finished_at
                  from unnest(?) as j(job)
                  join lateral (select started_at, finished_at from scheduled_run
                                 where job = j.job and status = 'succeeded'
                                 order by finished_at desc limit 1) r on true""", rs -> {
            while (rs.next()) {
                ScheduledRunMetrics metrics = jobs.get(rs.getString(1));
                Instant started = rs.getTimestamp(2).toInstant();
                Instant ended = rs.getTimestamp(3).toInstant();
                metrics.lastSuccess = ended;
                metrics.lastDuration = Duration.between(started, ended);
            }
            return null;
        }, (Object) jobs.keySet().toArray(String[]::new));
    }

    private static String instanceName() {
        String host = Optional.ofNullable(System.getenv("HOSTNAME")).orElse("local");
        return host + "/" + ProcessHandle.current().pid() + "/" + UUID.randomUUID().toString().substring(0, 8);
    }

    private static String truncate(String error) {
        return error == null || error.length() <= ERROR_LIMIT ? error : error.substring(0, ERROR_LIMIT);
    }

    private static Timestamp ts(Instant instant) {
        return Timestamp.from(instant);
    }

    private int update(String sql, Object... params) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = prepare(connection, sql, params)) {
            return statement.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException("scheduled_run: " + e.getMessage(), e);
        }
    }

    private <T> T query(String sql, ResultReader<T> reader, Object... params) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = prepare(connection, sql, params);
                ResultSet rs = statement.executeQuery()) {
            return reader.read(rs);
        } catch (SQLException e) {
            throw new IllegalStateException("scheduled_run: " + e.getMessage(), e);
        }
    }

    private static PreparedStatement prepare(Connection connection, String sql, Object... params) throws SQLException {
        PreparedStatement statement = connection.prepareStatement(sql);
        for (int i = 0; i < params.length; i++) {
            if (params[i] instanceof String[] array) {
                statement.setArray(i + 1, connection.createArrayOf("text", array));
            } else {
                statement.setObject(i + 1, params[i]);
            }
        }
        return statement;
    }

    private record Run(String job, String slot) {
    }

    @FunctionalInterface
    private interface ResultReader<T> {
        T read(ResultSet rs) throws SQLException;
    }
}
