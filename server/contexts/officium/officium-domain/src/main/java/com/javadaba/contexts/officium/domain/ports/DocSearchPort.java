package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocSearchHit;
import com.javadaba.contexts.officium.domain.DocSearchQuery;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Ranked full-text search over a project's pages and Officium's own, in one statement (JAVA-800). */
public interface DocSearchPort {

    /** A page the database does not hold (Officium's own documentation), searched with the same semantics. */
    record Extra(UUID id, String path, String title, String body, Instant updatedAt, Actor author) {
    }

    List<DocSearchHit> search(UUID projectId, UUID accountId, DocSearchQuery query, List<Extra> extras);
}
