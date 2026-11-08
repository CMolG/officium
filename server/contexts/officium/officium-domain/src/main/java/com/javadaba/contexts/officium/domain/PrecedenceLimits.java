package com.javadaba.contexts.officium.domain;

/** The caps of a precedence list (ADR 0032, JAVA-1686). */
public final class PrecedenceLimits {

    public static final int MAX_RULES = 20;
    public static final int MAX_VALUES = 20;
    public static final int NAME_MAX = 80;
    public static final int REASON_MAX = 500;

    private PrecedenceLimits() {
    }
}
