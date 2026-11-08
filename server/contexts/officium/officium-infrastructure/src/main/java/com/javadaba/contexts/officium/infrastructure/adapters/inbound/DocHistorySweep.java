package com.javadaba.contexts.officium.infrastructure.adapters.inbound;

import com.javadaba.contexts.officium.application.DocAttachmentService;
import com.javadaba.contexts.officium.application.DocHistoryService;
import com.javadaba.contexts.officium.application.DocLifecycleService;
import com.javadaba.platform.scheduling.Cadence;
import com.javadaba.platform.scheduling.ScheduledRuns;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Duration;

/**
 * The documentation's hourly housekeeping (design §4), one job with one step per card. It deletes the
 * page versions past their project's history window (JAVA-794; a write also drops what its own window
 * expired, so this only catches pages nobody edits) and purges what has sat in the trash for 30 days
 * (JAVA-793). It also deletes the files no page or kept version references (JAVA-798). Born turned on (final-decisions); the switch
 * exists to turn it OFF, and with it off a trashed page simply stays restorable for longer.
 */
@ApplicationScoped
public class DocHistorySweep {

    private static final Logger LOG = Logger.getLogger(DocHistorySweep.class);
    private static final Cadence EVERY_HOUR = Cadence.every(Duration.ofHours(1));

    private final DocHistoryService history;
    private final DocLifecycleService lifecycle;
    private final DocAttachmentService attachments;
    private final ScheduledRuns runs;
    private final boolean enabled;

    public DocHistorySweep(DocHistoryService history, DocLifecycleService lifecycle,
            DocAttachmentService attachments, ScheduledRuns runs,
            @ConfigProperty(name = "officium.docs.sweep.enabled", defaultValue = "true") boolean enabled) {
        this.history = history;
        this.lifecycle = lifecycle;
        this.attachments = attachments;
        this.runs = runs;
        this.enabled = enabled;
    }

    @Scheduled(identity = "officium-doc-history-sweep", every = "1h", delayed = "2m", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void sweep() {
        if (enabled) {
            runs.run("officium-doc-history-sweep", EVERY_HOUR, this::housekeep);
        }
    }

    private void housekeep() {
        int deleted = history.sweep();
        if (deleted > 0) {
            LOG.debugf("officium docs sweep: %d expired version(s) deleted", deleted);
        }
        int purged = lifecycle.sweep();
        if (purged > 0) {
            LOG.debugf("officium docs sweep: %d trashed page(s) purged", purged);
        }
        int orphans = attachments.sweep();
        if (orphans > 0) {
            LOG.debugf("officium docs sweep: %d unreferenced file(s) deleted", orphans);
        }
    }
}
