package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.DocLinks;
import com.javadaba.contexts.officium.domain.DocPageSummary;

import java.util.List;
import java.util.UUID;

/** Which documentation pages point at which paths (JAVA-792). Page writes keep it current themselves. */
public interface DocLinkRepository {

    /** A page whose links were never indexed at its present version. */
    record Unindexed(UUID id, UUID projectId, String path, String body, int version) {
    }

    /**
     * The pages (other than the target) whose links name the page's path, or a path that redirects to
     * it, by path: not in the trash, and not another member's unpublished draft.
     */
    List<DocPageSummary> backlinks(UUID projectId, UUID accountId, UUID pageId, String path);

    List<Unindexed> unindexed(int limit);

    /** Replaces the page's links, if it is still at {@code version}; {@code false} if it moved on. */
    boolean index(UUID pageId, int version, UUID projectId, List<DocLinks.Ref> refs);
}
