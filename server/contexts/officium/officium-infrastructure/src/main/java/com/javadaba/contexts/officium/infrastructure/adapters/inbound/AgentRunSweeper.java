package com.javadaba.contexts.officium.infrastructure.adapters.inbound;

import com.javadaba.contexts.officium.application.AgentRunService;
import com.javadaba.platform.scheduling.Cadence;
import com.javadaba.platform.scheduling.ScheduledRuns;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Duration;

/**
 * Closes the agent runs nobody ended, at their last sign of life, and imputes their time (JAVA-50,
 * contract §8.4). Born turned on (final-decisions: whatever runs on a loop ships working); the
 * switch exists to turn it OFF. With it off, an abandoned run is still closed -- lazily, the next
 * time that card's run starts -- only later.
 */
@ApplicationScoped
public class AgentRunSweeper {

    private static final Logger LOG = Logger.getLogger(AgentRunSweeper.class);
    private static final Cadence EVERY_5M = Cadence.every(Duration.ofMinutes(5));

    private final AgentRunService agentRuns;
    private final ScheduledRuns runs;
    private final boolean enabled;

    public AgentRunSweeper(AgentRunService agentRuns, ScheduledRuns runs,
            @ConfigProperty(name = "officium.agent-runs.sweep.enabled", defaultValue = "true") boolean enabled) {
        this.agentRuns = agentRuns;
        this.runs = runs;
        this.enabled = enabled;
    }

    @Scheduled(identity = "officium-agent-run-sweep", every = "5m", delayed = "1m", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void sweep() {
        if (enabled) {
            runs.run("officium-agent-run-sweep", EVERY_5M, this::closeAbandoned);
        }
    }

    private void closeAbandoned() {
        int closed = agentRuns.sweep();
        if (closed > 0) {
            LOG.debugf("officium agent-run sweep: %d abandoned run(s) closed", closed);
        }
    }
}
