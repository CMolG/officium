package com.javadaba.contexts.officium.domain;

import java.util.Arrays;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * The phase of the origin card that let a defect through (card://JAVA-1525): its plan in Refine missed it, its
 * implementation in Action introduced it, or its review approved it without catching it.
 */
public enum EscapedPhase {
    REFINE("refine"), ACTION("action"), REVIEW("review");

    private final String wire;

    EscapedPhase(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public static Optional<EscapedPhase> find(String value) {
        return Arrays.stream(values()).filter(phase -> phase.wire.equals(value)).findFirst();
    }

    public static String wires() {
        return Arrays.stream(values()).map(EscapedPhase::wire).collect(Collectors.joining(" | "));
    }
}
