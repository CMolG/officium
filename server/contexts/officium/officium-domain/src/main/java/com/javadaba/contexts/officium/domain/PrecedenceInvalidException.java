package com.javadaba.contexts.officium.domain;

/**
 * A precedence list that is refused (ADR 0032, JAVA-1686): {@code 422} with the closed code of the first refusal,
 * the position of its rule in the list sent and the field that broke. The body adds {@code ruleIndex} and
 * {@code field}, the way a {@code jql_invalid} carries {@code at}.
 */
public final class PrecedenceInvalidException extends OfficiumException {

    private final PrecedenceRefusal refusal;

    public PrecedenceInvalidException(PrecedenceRefusal refusal) {
        super(refusal.code(), refusal.message(), 422);
        this.refusal = refusal;
    }

    public PrecedenceRefusal refusal() {
        return refusal;
    }
}
