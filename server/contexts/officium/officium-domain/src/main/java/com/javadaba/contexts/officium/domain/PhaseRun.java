package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Who ran the phase a card just left (card://JAVA-1527): kept on every status change, so Contributions can say
 * which work profile, role, model and effort delivered each phase. {@code profileId} is the project's active
 * profile at that moment (null under Officium's defaults); {@code role} is the one the mover named (null when it
 * named none); {@code model} and {@code effort} are that role's cell in the matrix then in force.
 */
public record PhaseRun(UUID id, UUID projectId, UUID cardId, Instant at, ActorKind actorKind, Status from, Status to,
        Category category, String profileId, String role, String model, String effort) {

    public PhaseRun {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(projectId, "projectId");
        Objects.requireNonNull(cardId, "cardId");
        Objects.requireNonNull(at, "at");
        Objects.requireNonNull(actorKind, "actorKind");
        Objects.requireNonNull(from, "from");
        Objects.requireNonNull(to, "to");
    }
}
