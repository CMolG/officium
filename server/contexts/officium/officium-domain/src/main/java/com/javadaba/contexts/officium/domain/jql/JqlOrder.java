package com.javadaba.contexts.officium.domain.jql;

/** One {@code ORDER BY} term -- the Java twin of {@code jql.ts}'s {@code JqlOrder} (contract
 *  JDB-270). */
public record JqlOrder(JqlFieldId field, Dir dir) {

    public enum Dir {
        ASC, DESC
    }
}
