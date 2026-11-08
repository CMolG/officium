package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

public enum SprintState {
    PLANNED("planned"), ACTIVE("active"), CLOSED("closed");

    private final String wire;

    SprintState(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public static SprintState fromWire(String value) {
        return Arrays.stream(values())
                .filter(s -> s.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown sprint state: " + value));
    }
}
