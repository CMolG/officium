package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

/** What the time was spent on (JAVA-245): refining the card, or working it. Imputed time is refinement
 *  while the card sat in {@link Status#REFINE}; a person's logged time is work. {@link #TEST} (JAVA-983)
 *  is the time an agent spent running tests; only a harness report sets it, whatever column the card sits in. */
public enum TimeConcept {
    WORK("work"), REFINE("refine"), TEST("test");

    private final String wire;

    TimeConcept(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public static TimeConcept fromWire(String value) {
        return Arrays.stream(values())
                .filter(c -> c.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown time concept: " + value));
    }
}
