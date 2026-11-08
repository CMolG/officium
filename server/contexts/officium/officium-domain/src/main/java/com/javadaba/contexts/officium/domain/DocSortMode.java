package com.javadaba.contexts.officium.domain;

/** How a documentation node orders its children (JAVA-791, contract §8.17). */
public enum DocSortMode {
    MANUAL("manual"), ALPHABETICAL("alphabetical");

    private final String wire;

    DocSortMode(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public static DocSortMode fromWire(String value) {
        for (DocSortMode mode : values()) {
            if (mode.wire.equals(value)) {
                return mode;
            }
        }
        throw OfficiumException.badRequest("invalid_sort_mode", "A sort mode is \"manual\" or \"alphabetical\"");
    }
}
