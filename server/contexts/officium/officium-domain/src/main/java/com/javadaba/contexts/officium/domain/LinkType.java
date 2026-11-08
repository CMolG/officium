package com.javadaba.contexts.officium.domain;

public enum LinkType {
    /** Symmetric: one stored edge, shown on both ends' {@code related} list. */
    RELATED,
    /** Directed: {@code source blocks target}. Shown as {@code blocks} on the source and
     *  {@code blockedBy} on the target. */
    BLOCKS
}
