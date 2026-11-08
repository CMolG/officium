package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.UUID;

/** A {@link DocPage} without its body: what a tree, a search result or a lifecycle list needs (JAVA-130). */
public record DocPageSummary(UUID id, String path, String title, int version, Actor updatedBy, Instant updatedAt,
        DocLifecycle lifecycle, boolean template) {

    public DocPageSummary {
        lifecycle = lifecycle == null ? DocLifecycle.publishedAt(updatedAt) : lifecycle;
    }

    /** A page, not a template. */
    public DocPageSummary(UUID id, String path, String title, int version, Actor updatedBy, Instant updatedAt,
            DocLifecycle lifecycle) {
        this(id, path, title, version, updatedBy, updatedAt, lifecycle, false);
    }

    public DocPageSummary(UUID id, String path, String title, int version, Actor updatedBy, Instant updatedAt) {
        this(id, path, title, version, updatedBy, updatedAt, null);
    }
}
