package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

/**
 * The closed palette a project's icon is drawn in (JAVA-51). Closed on purpose: each hue is checked
 * for contrast once, in the app's tokens, which a free hex could never be.
 */
public enum ProjectColor {
    SLATE("slate"), RED("red"), ORANGE("orange"), AMBER("amber"), GREEN("green"), TEAL("teal"), BLUE("blue"), INDIGO(
            "indigo"), VIOLET("violet"), PINK("pink");

    private final String wire;

    ProjectColor(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public static ProjectColor fromWire(String value) {
        return Arrays.stream(values())
                .filter(c -> c.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown project color: " + value));
    }
}
