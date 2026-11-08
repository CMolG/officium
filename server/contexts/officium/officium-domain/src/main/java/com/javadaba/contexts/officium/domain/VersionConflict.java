package com.javadaba.contexts.officium.domain;

/**
 * Marker for an {@link OfficiumException} that carries the current state of the entity a stale
 * write collided with (contract §1.3: {@code 409 {error:"version_conflict", message, current}}).
 * Implemented by {@code officium-application}'s conflict exceptions so
 * {@code OfficiumExceptionMapper} (officium-infrastructure) can add {@code current} to the body
 * without knowing the concrete entity type.
 */
public interface VersionConflict {
    Object current();
}
