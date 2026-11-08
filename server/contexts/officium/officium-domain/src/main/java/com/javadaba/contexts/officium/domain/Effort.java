package com.javadaba.contexts.officium.domain;

/** How hard the model reasons on a card (JAVA-915): the levels {@code claude --effort} takes. */
public enum Effort {
    LOW("low"), MEDIUM("medium"), HIGH("high"), XHIGH("xhigh"), MAX("max");

    private final String wire;

    Effort(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public static Effort fromWire(String value) {
        for (Effort effort : values()) {
            if (effort.wire.equals(value)) {
                return effort;
            }
        }
        throw OfficiumException.badRequest("invalid_role_matrix",
                "An effort is one of low, medium, high, xhigh or max, not: " + value);
    }
}
