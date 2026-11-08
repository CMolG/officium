package com.javadaba.contexts.officium.domain;

/**
 * Marker for an {@link OfficiumException} that carries the character offset a query failed to
 * parse at (contract JDB-270: {@code 400 {error:"jql_invalid", message, at}}), the same shape
 * {@link VersionConflict} gives {@code current} -- {@code OfficiumExceptionMapper} adds {@code at}
 * to the body without knowing the concrete exception type. Implemented by
 * {@code com.javadaba.contexts.officium.domain.jql.JqlInvalidException}.
 */
public interface JqlInvalid {
    int at();
}
