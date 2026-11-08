package com.javadaba.contexts.officium.domain.jql;

/** What kind of value a field holds -- the Java twin of {@code jql.ts}'s {@code FieldKind} union,
 *  which is what {@link JqlValues#invalid} and {@link JqlEvaluator} switch on instead of the field
 *  identity itself (several fields share a kind: {@code text}/{@code summary}/{@code description}
 *  are all {@link #TEXT}). */
enum JqlFieldKind {
    KEY, TEXT, STATUS, PRIORITY, EXECUTOR, CATEGORY, RUN_STATE, NAME, LIST, BOOL, DATE, NUMBER, REJECTION, RETURN_REASON
}
