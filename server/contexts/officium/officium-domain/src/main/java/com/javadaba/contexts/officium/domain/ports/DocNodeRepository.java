package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.DocNode;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** The documentation tree's sparse layout rows (JAVA-791), keyed by {@code (projectId, path)}. */
public interface DocNodeRepository {

    List<DocNode> list(UUID projectId);

    Optional<DocNode> find(UUID projectId, String path);

    /** {@code false} when a row already holds that path (a concurrent create won). */
    boolean insert(DocNode node);

    boolean updateIfVersion(DocNode node, int expectedVersion);

    /** Inserts or overwrites every node in one transaction: a reorder renumbers a whole sibling group. */
    void upsertAll(List<DocNode> nodes);

    boolean deleteIfVersion(UUID projectId, String path, int expectedVersion);
}
