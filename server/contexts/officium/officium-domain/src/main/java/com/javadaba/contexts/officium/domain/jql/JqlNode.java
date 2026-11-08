package com.javadaba.contexts.officium.domain.jql;

import java.util.List;

/** The parsed query tree -- the Java twin of {@code jql.ts}'s {@code JqlNode} union (contract
 *  JDB-270): {@code AND}/{@code OR} over any number of items, {@code NOT} of one, or a leaf
 *  {@code Clause} (a field, its operator, and one or more values -- more than one only for
 *  {@code in}/{@code not in}). */
public sealed interface JqlNode {

    record And(List<JqlNode> items) implements JqlNode {
    }

    record Or(List<JqlNode> items) implements JqlNode {
    }

    record Not(JqlNode item) implements JqlNode {
    }

    record Clause(JqlFieldId field, JqlOp op, List<JqlValue> values) implements JqlNode {
    }
}
