package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

/**
 * Where a card sits on the board (contract §2). Fluxor's {@code javadaba.fluxor.task-states} once
 * mirrored this list; it has six states in another order and no {@code done}, so the two are no
 * longer kept aligned.
 *
 * <p>{@link #DONE} and {@link #REJECTED} are the states with no column. Done (user decision,
 * 2026-09-23): a card verified in production leaves the board and is read from "View completed".
 * Deploy was the last column until then, so it kept every shipped card forever. Rejected
 * (card://JAVA-1415): a discarded card, kept with its reason and read from "View rejected".
 *
 * <p>Declared in board order. {@link #DOING} comes before {@link #READY} (user decision,
 * 2026-09-24), so Ready no longer means "ready to start" -- that is {@link #TODO}.
 */
public enum Status {
    REFINE("refine"), TODO("todo"), DOING("doing"), READY("ready"), REVIEW("review"), DEPLOY("deploy"), DONE(
            "done"), REJECTED("rejected");

    private final String wire;

    Status(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    /**
     * Deploy or done: the work is finished, so the card blocks nobody and no one picks it up. A
     * rejected card is not finished: it keeps blocking until its links are re-pointed or removed
     * (card://JAVA-1415), so a discarded blocker never passes for shipped work.
     */
    public boolean finished() {
        return this == DEPLOY || this == DONE;
    }

    /** Done or rejected: off the board, never worked again, never counted as open. */
    public boolean closed() {
        return this == DONE || this == REJECTED;
    }

    /** Refine, to do or doing: a human card here still waits on its person. From Ready on, the
     *  person's part is done and the card leaves "Needs you" (JAVA-586). */
    public boolean needsPerson() {
        return this == REFINE || this == TODO || this == DOING;
    }

    public static Status fromWire(String value) {
        return Arrays.stream(values())
                .filter(s -> s.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown status: " + value));
    }
}
