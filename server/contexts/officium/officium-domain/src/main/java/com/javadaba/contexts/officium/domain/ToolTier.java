package com.javadaba.contexts.officium.domain;

/**
 * The most a session that works a role may do with its tools (JAVA-1445): {@code read} reads the tree and the board,
 * {@code comment} adds the project's declared checks and the loop's own CLI, {@code write} is the session as it is
 * today. Declared by each role in Fluxor's market; narrowest first, so {@code READ} is less than {@code WRITE}.
 */
public enum ToolTier {
    READ("read"), COMMENT("comment"), WRITE("write");

    private final String wire;

    ToolTier(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    public static ToolTier fromWire(String value) {
        for (ToolTier tier : values()) {
            if (tier.wire.equals(value)) {
                return tier;
            }
        }
        throw OfficiumException.badRequest("invalid_tool_tier",
                "A tool tier is one of read, comment or write, not: " + value);
    }
}
