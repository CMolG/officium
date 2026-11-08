package com.javadaba.contexts.officium.infrastructure.adapters.inbound;

import com.javadaba.contexts.officium.application.SpikeTimeBoxService;
import com.javadaba.platform.scheduling.Cadence;
import com.javadaba.platform.scheduling.ScheduledRuns;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Duration;

/**
 * Delivers each agent's spike whose time box ran out to Ready (JAVA-878), within five minutes of its end. Born
 * turned on (final-decisions: whatever runs on a loop ships working); the switch exists to turn it OFF, and with
 * it off a spike stays In progress past its box until someone moves it.
 */
@ApplicationScoped
public class SpikeTimeBoxSweeper {

    private static final Logger LOG = Logger.getLogger(SpikeTimeBoxSweeper.class);
    private static final Cadence EVERY_5M = Cadence.every(Duration.ofMinutes(5));

    private final SpikeTimeBoxService spikes;
    private final ScheduledRuns runs;
    private final boolean enabled;

    public SpikeTimeBoxSweeper(SpikeTimeBoxService spikes, ScheduledRuns runs,
            @ConfigProperty(name = "officium.spike-time-box.sweep.enabled", defaultValue = "true") boolean enabled) {
        this.spikes = spikes;
        this.runs = runs;
        this.enabled = enabled;
    }

    @Scheduled(identity = "officium-spike-time-box-sweep", every = "5m", delayed = "1m", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void sweep() {
        if (enabled) {
            runs.run("officium-spike-time-box-sweep", EVERY_5M, this::deliverExpired);
        }
    }

    private void deliverExpired() {
        int delivered = spikes.deliverExpired();
        if (delivered > 0) {
            LOG.debugf("officium spike time box sweep: %d spike(s) delivered to ready", delivered);
        }
    }
}
