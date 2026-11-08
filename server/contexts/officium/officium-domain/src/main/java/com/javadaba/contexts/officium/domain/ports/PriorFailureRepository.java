package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.PriorFailures;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** The failure rows of a project's window (card://JAVA-1803): its send-backs and escaped defects, read in one place. */
public interface PriorFailureRepository {

    /**
     * The send-backs and escaped defects recorded since {@code since}, most recent first, at most {@code limit} of
     * each kind; {@code truncated} says a kind had more rows than that.
     */
    Window window(UUID projectId, Instant since, int limit);

    /** {@code rows} are the newest of both kinds, most recent first; a send-back's quote is its findings, cut to 500 characters. */
    record Window(List<PriorFailures.Failure> rows, boolean truncated) {
    }
}
