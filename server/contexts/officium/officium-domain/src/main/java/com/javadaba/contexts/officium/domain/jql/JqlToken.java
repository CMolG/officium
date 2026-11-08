package com.javadaba.contexts.officium.domain.jql;

/** One lexed token, with its character offsets so a parse error can point at it -- the Java twin
 *  of {@code jql.ts}'s {@code Token}. */
record JqlToken(JqlTokenKind kind, String value, int start, int end) {
}
