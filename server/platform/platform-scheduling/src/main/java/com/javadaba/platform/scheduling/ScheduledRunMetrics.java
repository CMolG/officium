package com.javadaba.platform.scheduling;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.MultiGauge;
import io.micrometer.core.instrument.Tags;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * What Prometheus sees of one job. The last success comes from the table, so every instance
 * reports the same truth whichever of them ran it; until there is one, it reads as the moment
 * this JVM first ticked the job, so a job that never succeeds still trips the alert.
 */
final class ScheduledRunMetrics {

    final Counter failures;
    final Counter runs;
    volatile Instant lastSuccess;
    volatile Duration lastDuration = Duration.ZERO;

    ScheduledRunMetrics(MeterRegistry meters, String job, Cadence cadence, Instant firstTick) {
        this.lastSuccess = firstTick;
        this.failures = Counter.builder("javadaba.scheduled.job.failures")
                .description("Runs of a scheduled job that threw, on this instance")
                .tag("job_name", job)
                .register(meters);
        this.runs = Counter.builder("javadaba.scheduled.job.runs")
                .description("Runs of a scheduled job this instance closed, failed ones included")
                .tag("job_name", job)
                .register(meters);
        Gauge.builder("javadaba.scheduled.job.last.success", this, m -> m.lastSuccess.getEpochSecond())
                .description("When the job last succeeded on any instance (epoch seconds)")
                .tag("job_name", job)
                .baseUnit("seconds")
                .register(meters);
        Gauge.builder("javadaba.scheduled.job.last.duration", this, m -> m.lastDuration.toMillis() / 1000.0)
                .description("How long the job's last successful run took")
                .tag("job_name", job)
                .baseUnit("seconds")
                .register(meters);
        Gauge.builder("javadaba.scheduled.job.interval", cadence, c -> c.period().toSeconds())
                .description("How often the job is due: the missed-run alert counts in these")
                .tag("job_name", job)
                .baseUnit("seconds")
                .strongReference(true)
                .register(meters);
    }

    /** One run in flight: when it started, and which slot and instance hold it. */
    record Running(String job, String slot, String instance, Instant startedAt) {
    }

    /**
     * The {@code started_at} of every run still {@code running}, one series per run. Registered
     * with overwrite, so a run that ended stops being exported on the next refresh. The instance
     * label is {@code run_instance} because Prometheus would rename {@code instance}.
     */
    static MultiGauge runningSince(MeterRegistry meters) {
        return MultiGauge.builder("javadaba.scheduled.job.running.since")
                .description("When each run still in flight started (epoch seconds)")
                .baseUnit("seconds")
                .register(meters);
    }

    static void publish(MultiGauge gauge, List<Running> running) {
        gauge.register(running.stream()
                .map(r -> MultiGauge.Row.of(
                        Tags.of("job_name", r.job(), "slot", r.slot(), "run_instance", r.instance()),
                        r.startedAt().getEpochSecond()))
                .toList(), true);
    }
}
