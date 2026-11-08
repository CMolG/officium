package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.RoleMatrix;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * A project's override of the default {@link RoleMatrix} (JAVA-294): only the cells it names. No row
 * is version 0, which is what a first write expects.
 */
public interface RoleMatrixRepository {

    Optional<Stored> find(UUID projectId);

    /** @return {@code false} when the stored version is not {@code expectedVersion}. */
    boolean saveIfVersion(UUID projectId, RoleMatrix overrides, int expectedVersion, Instant at);

    record Stored(RoleMatrix overrides, int version, Instant updatedAt) {
    }
}
