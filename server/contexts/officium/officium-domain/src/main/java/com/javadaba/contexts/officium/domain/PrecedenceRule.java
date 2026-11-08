package com.javadaba.contexts.officium.domain;

import java.util.UUID;

/** One rule of a project's precedence list (JAVA-1686). The server assigns {@code id} on first save. */
public record PrecedenceRule(UUID id, String name, String reason, PrecedenceMatch match,
        PrecedenceDefaults defaults) {

    /** A rule sent without defaults gives its cards nothing: no priority floor and no sprint. */
    public PrecedenceRule {
        defaults = defaults == null ? new PrecedenceDefaults(null, PrecedenceSprint.NONE) : defaults;
    }
}
