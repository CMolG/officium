package com.javadaba.contexts.officium.domain.jql;

/** The fields OQL can filter or sort by -- the Java twin of {@code jql.ts}'s {@code FieldId}
 *  union (contract JDB-270). What each accepts (names, value kind, operators, sortability) is
 *  {@link JqlFields}, not here: this enum is only the identity a {@link JqlNode.Clause} or
 *  {@link JqlOrder} carries. */
public enum JqlFieldId {
    KEY, SUMMARY, DESCRIPTION, TEXT, STATUS, PRIORITY, EXECUTOR, CATEGORY, RUN_STATE, ASSIGNEE, EPIC, LABELS, BLOCKED, CREATED, UPDATED, ESTIMATE, REJECTION, REVIEW_RETURNS, RETURN_REASON
}
