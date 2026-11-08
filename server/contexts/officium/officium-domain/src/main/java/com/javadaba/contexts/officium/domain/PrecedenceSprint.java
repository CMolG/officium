package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

/** What a precedence rule does to a card's sprint: nothing, or plant it in the active sprint (JAVA-1686). */
public enum PrecedenceSprint {
    NONE("none"), JOIN("join");

    private final String wire;

    PrecedenceSprint(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public static PrecedenceSprint fromWire(String value) {
        return Arrays.stream(values())
                .filter(s -> s.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown precedence sprint: " + value));
    }
}
