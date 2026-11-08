package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

/**
 * Who can execute this card -- a third axis, independent of {@link Status} (where the card is) and
 * {@link RunState} (whether an agent runs it now). A {@code HUMAN} card's {@code runState} is
 * always {@link RunState#IDLE} and it always has at least one person assignee (see
 * {@code CardRules}).
 */
public enum Executor {
    AI("ai"), HUMAN("human");

    private final String wire;

    Executor(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public static Executor fromWire(String value) {
        return Arrays.stream(values())
                .filter(e -> e.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown executor: " + value));
    }
}
