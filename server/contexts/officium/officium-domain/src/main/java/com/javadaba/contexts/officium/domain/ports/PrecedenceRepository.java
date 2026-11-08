package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.PrecedenceRule;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * A project's precedence rules (JAVA-1686, ADR 0032): the whole list, replaced under its version. No row is
 * version 0, which is what a first write expects.
 */
public interface PrecedenceRepository {

    Optional<Stored> find(UUID projectId);

    /** @return {@code false} when the stored version is not {@code expectedVersion}. */
    boolean saveIfVersion(UUID projectId, List<PrecedenceRule> rules, Actor updatedBy, int expectedVersion,
            Instant at);

    record Stored(List<PrecedenceRule> rules, int version, Instant updatedAt, Actor updatedBy) {
    }
}
