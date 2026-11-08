package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.DocStars;

import java.util.List;
import java.util.UUID;
import java.util.function.UnaryOperator;

/** A person's stars in a project (JAVA-799), kept as one ordered list that is always written whole. */
public interface DocStarRepository {

    /** The list before and after one {@link #update}. */
    record Change(List<DocStars.Target> before, List<DocStars.Target> after) {
    }

    /** The stars of {@code accountId}, in order. A star on a trashed page stays in the list. */
    List<DocStars.Target> list(UUID projectId, UUID accountId);

    /**
     * Reads the list, applies {@code change} and writes the result (numbered 0..n-1) only when it differs,
     * all in one transaction that holds the person's lock for the project, so two writes by the same
     * person (two tabs) run one after the other and neither is lost (JAVA-1476).
     */
    Change update(UUID projectId, UUID accountId, UnaryOperator<List<DocStars.Target>> change);

    /** Erases every star of {@code accountId} in the project (JAVA-1478: they can no longer read it). */
    void forget(UUID projectId, UUID accountId);
}
