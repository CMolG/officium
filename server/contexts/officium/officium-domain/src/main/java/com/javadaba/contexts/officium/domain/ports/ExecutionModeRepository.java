package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.ExecutionMode;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** A project's execution mode (card://JAVA-1878), replaced under its version; no row is {@code card}, version 0. */
public interface ExecutionModeRepository {

    Optional<Stored> find(UUID projectId);

    /** @return {@code false} when the stored version is not {@code expectedVersion}. */
    boolean saveIfVersion(UUID projectId, ExecutionMode mode, Actor updatedBy, int expectedVersion, Instant at);

    record Stored(ExecutionMode mode, int version, Instant updatedAt, Actor updatedBy) {
    }
}
