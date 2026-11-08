package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * The last time a PERSON changed what a card says -- its title, description, action plan,
 * priority, estimate, epic, tags or assignees, or by commenting on it -- and whether an agent has
 * looked since (user request, 2026-09-23).
 *
 * <p>It exists for the agent, not for the board: a card that "needs a person" is often finished
 * by that person editing it, and without this the agent cannot tell a card someone answered from
 * one nobody touched. Saving the same content is not an edit ({@link Card#sameContentAs}), so a
 * person opening a card and pressing save does not raise the flag.
 */
public record HumanEdit(Instant editedAt, Actor editedBy, Instant reviewedAt) {

    public HumanEdit {
        Objects.requireNonNull(editedAt, "editedAt");
        Objects.requireNonNull(editedBy, "editedBy");
        if (editedBy.kind() != ActorKind.PERSON) {
            throw new IllegalArgumentException("A human edit is made by a person");
        }
    }

    /** No agent has acknowledged this edit yet. */
    public boolean pending() {
        return reviewedAt == null || reviewedAt.isBefore(editedAt);
    }

    public HumanEdit reviewed(Instant at) {
        return new HumanEdit(editedAt, editedBy, at);
    }

    /** A new edit by {@code person} on top of an earlier one: pending again until reviewed. */
    public static HumanEdit after(HumanEdit previous, Actor person, Instant at) {
        return new HumanEdit(at, person, previous == null ? null : previous.reviewedAt());
    }
}
