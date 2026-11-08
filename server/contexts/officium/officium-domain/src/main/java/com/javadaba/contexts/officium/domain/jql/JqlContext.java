package com.javadaba.contexts.officium.domain.jql;

import java.time.Instant;
import java.util.UUID;

/** {@code currentUser()} and {@code now()}'s answers for one evaluation -- the Java twin of
 *  {@code jql.ts}'s {@code JqlContext} (contract JDB-270). {@code currentUser} null matches
 *  nobody, same as the browser evaluating for a signed-out visitor. */
public record JqlContext(UUID currentUser, Instant now) {
}
