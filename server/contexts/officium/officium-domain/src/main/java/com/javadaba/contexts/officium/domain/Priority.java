package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

public enum Priority {
    SUPER_HIGH("superHigh", 0), HIGH("high", 1), MEDIUM("medium", 2), LOW("low", 3), SUPER_LOW("superLow", 4);

    private final String wire;
    private final int rank;

    Priority(String wire, int rank) {
        this.wire = wire;
        this.rank = rank;
    }

    public String wire() {
        return wire;
    }

    /** Lower rank sorts first -- used by {@code sort=priority} and by {@code cards.next}. */
    public int rank() {
        return rank;
    }

    public static Priority fromWire(String value) {
        return Arrays.stream(values())
                .filter(p -> p.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown priority: " + value));
    }
}
