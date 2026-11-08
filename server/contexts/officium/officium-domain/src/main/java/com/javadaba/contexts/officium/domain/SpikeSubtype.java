package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

/**
 * Which of the spike contract's two subtypes a spike is (JAVA-339, JAVA-391): a technical question,
 * or a UX/UI one. A field of the card, set by whoever writes it, because it decides which roles the
 * board computes ({@link RoleMatrix}): {@code technical} reads the {@code spike} row, {@code ux-ui}
 * the {@link RoleMatrix#SPIKE_UX_UI} row. Only a spike carries one ({@link Card}).
 */
public enum SpikeSubtype {
    TECHNICAL("technical"), UX_UI("ux-ui");

    private final String wire;

    SpikeSubtype(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    /** A value a caller sent: an unknown one is their mistake, answered {@code 400 invalid_subtype}. */
    public static SpikeSubtype fromWire(String value) {
        return Arrays.stream(values())
                .filter(s -> s.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> OfficiumException.badRequest("invalid_subtype", "Unknown subtype: " + value
                        + ". One of: "
                        + String.join(", ", Arrays.stream(values()).map(SpikeSubtype::wire).toList())));
    }
}
