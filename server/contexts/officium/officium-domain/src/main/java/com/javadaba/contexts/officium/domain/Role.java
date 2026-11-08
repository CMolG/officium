package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

/** A project member's role. Ordered from most to least capable so {@link #atLeast} is a simple
 *  ordinal comparison. */
public enum Role {
    OWNER("owner"), EDITOR("editor"), VIEWER("viewer");

    private final String wire;

    Role(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public boolean atLeast(Role required) {
        return this.ordinal() <= required.ordinal();
    }

    public static Role fromWire(String value) {
        return Arrays.stream(values())
                .filter(r -> r.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown role: " + value));
    }
}
