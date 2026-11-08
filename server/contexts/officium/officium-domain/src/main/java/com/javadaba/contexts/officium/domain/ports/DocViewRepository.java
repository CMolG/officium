package com.javadaba.contexts.officium.domain.ports;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** The pages a person opened, newest first (JAVA-799). */
public interface DocViewRepository {

    record View(UUID pageId, Instant viewedAt) {
    }

    /**
     * Records that {@code accountId} opened the page, and in the same transaction keeps only the
     * newest {@code keep} views of theirs in the project.
     */
    void record(UUID projectId, UUID accountId, UUID pageId, Instant at, int keep);

    /** At most {@code limit} views, newest first. A trashed page's view stays until it is purged. */
    List<View> recent(UUID projectId, UUID accountId, int limit);

    /** Erases every view of {@code accountId} in the project (JAVA-1478: they can no longer read it). */
    void forget(UUID projectId, UUID accountId);
}
