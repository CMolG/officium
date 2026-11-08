package com.javadaba.contexts.officium.infrastructure.adapters.inbound;

import com.javadaba.contexts.officium.application.DocLinkIndexer;
import com.javadaba.platform.scheduling.Cadence;
import com.javadaba.platform.scheduling.ScheduledRuns;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Duration;

/**
 * Indexes the links of documentation pages nobody indexed yet, hourly (JAVA-792): the first run after
 * the release is the backfill, later ones catch what the previous release writes during a rolling
 * deploy. Born turned on (final-decisions).
 */
@ApplicationScoped
public class DocLinkSweep {

    private static final Logger LOG = Logger.getLogger(DocLinkSweep.class);
    private static final Cadence EVERY_HOUR = Cadence.every(Duration.ofHours(1));

    private final DocLinkIndexer indexer;
    private final ScheduledRuns runs;
    private final boolean enabled;

    public DocLinkSweep(DocLinkIndexer indexer, ScheduledRuns runs,
            @ConfigProperty(name = "officium.docs.links.enabled", defaultValue = "true") boolean enabled) {
        this.indexer = indexer;
        this.runs = runs;
        this.enabled = enabled;
    }

    @Scheduled(identity = "officium-doc-links", every = "1h", delayed = "1m", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void sweep() {
        if (enabled) {
            runs.run("officium-doc-links", EVERY_HOUR, this::index);
        }
    }

    private void index() {
        int indexed = indexer.run();
        if (indexed > 0) {
            LOG.debugf("officium doc-links sweep: %d page(s) indexed", indexed);
        }
    }
}
