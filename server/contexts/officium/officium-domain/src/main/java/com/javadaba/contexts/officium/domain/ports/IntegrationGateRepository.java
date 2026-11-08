package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.IntegrationGate;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** A project's integration gate rules (JAVA-1820), replaced under their version; no row is version 0. */
public interface IntegrationGateRepository {

    Optional<Stored> find(UUID projectId);

    /** @return {@code false} when the stored version is not {@code expectedVersion}. */
    boolean saveIfVersion(UUID projectId, IntegrationGate.Rules rules, Actor updatedBy, int expectedVersion,
            Instant at);

    record Stored(IntegrationGate.Rules rules, int version, Instant updatedAt, Actor updatedBy) {
    }
}
