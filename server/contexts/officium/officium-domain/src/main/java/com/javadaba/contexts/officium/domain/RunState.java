package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

public enum RunState {
    IDLE("idle"), RUNNING("running"), COMPLETED("completed"), FAILED("failed");

    private final String wire;

    RunState(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public static RunState fromWire(String value) {
        return Arrays.stream(values())
                .filter(s -> s.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown runState: " + value));
    }
}
