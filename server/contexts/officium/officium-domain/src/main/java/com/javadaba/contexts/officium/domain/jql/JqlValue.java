package com.javadaba.contexts.officium.domain.jql;

/** A value as written (unquoted) plus what it means: a call to one of the four {@link
 *  JqlFunction}s, or the literal {@code EMPTY}/{@code NULL} keyword of an {@code is}/{@code is
 *  not} clause -- the Java twin of {@code jql.ts}'s {@code JqlValue} interface (contract
 *  JDB-270). */
public record JqlValue(String raw, JqlFunction fn, boolean empty) {

    public JqlValue(String raw) {
        this(raw, null, false);
    }

    static JqlValue emptyKeyword() {
        return new JqlValue("EMPTY", null, true);
    }
}
