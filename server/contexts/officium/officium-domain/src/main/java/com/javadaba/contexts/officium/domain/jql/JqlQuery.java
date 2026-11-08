package com.javadaba.contexts.officium.domain.jql;

import java.util.List;

/** A parsed query -- the Java twin of {@code jql.ts}'s {@code JqlQuery} (contract JDB-270).
 *  {@code where} is {@code null} for an empty query, which matches every card, same as
 *  {@code jql.ts}. */
public record JqlQuery(JqlNode where, List<JqlOrder> orderBy) {

    public JqlQuery {
        orderBy = orderBy == null ? List.of() : List.copyOf(orderBy);
    }
}
