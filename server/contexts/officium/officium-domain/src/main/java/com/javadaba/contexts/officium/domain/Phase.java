package com.javadaba.contexts.officium.domain;

import java.util.Arrays;
import java.util.Optional;

/**
 * The kind of work a card's status asks for (user decision, 2026-09-29, JAVA-294): Refine is
 * planning, To do and Doing are action, Ready is delivery analysis, Review is verification, Deploy
 * is validation. Done and rejected ask for none. {@link RoleMatrix} picks the roles by phase, not by status.
 */
public enum Phase {
    REFINE("refine"), ACTION("action"), READY("ready"), REVIEW("review"), DEPLOY("deploy");

    private final String wire;

    Phase(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public static Optional<Phase> of(Status status) {
        return switch (status) {
            case REFINE -> Optional.of(REFINE);
            case TODO, DOING -> Optional.of(ACTION);
            case READY -> Optional.of(READY);
            case REVIEW -> Optional.of(REVIEW);
            case DEPLOY -> Optional.of(DEPLOY);
            case DONE, REJECTED -> Optional.empty();
        };
    }

    /** The status a card is in while this phase runs: the inverse of {@link #of} (To do stands for action). */
    public Status status() {
        return switch (this) {
            case REFINE -> Status.REFINE;
            case ACTION -> Status.TODO;
            case READY -> Status.READY;
            case REVIEW -> Status.REVIEW;
            case DEPLOY -> Status.DEPLOY;
        };
    }

    public static Phase fromWire(String value) {
        return Arrays.stream(values())
                .filter(p -> p.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> OfficiumException.badRequest("invalid_phase", "Unknown phase: " + value
                        + ". One of: " + String.join(", ", Arrays.stream(values()).map(Phase::wire).toList())));
    }
}
