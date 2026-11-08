package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * One send-back of a card from review or deploy to a work phase (card://JAVA-1416): when, who (and the role
 * they reviewed as), from and to which state, the reasons, and the comment that carried the findings.
 * Append-only; {@code commentId} is null once that comment is deleted.
 */
public record ReviewReturn(UUID id, UUID projectId, UUID cardId, Instant at, Actor actor, String role,
        Status from, Status to, List<ReviewReturnReason> reasons, UUID commentId) {

    public ReviewReturn {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(cardId, "cardId");
        Objects.requireNonNull(at, "at");
        Objects.requireNonNull(actor, "actor");
        Objects.requireNonNull(from, "from");
        Objects.requireNonNull(to, "to");
        if (reasons == null || reasons.isEmpty()) {
            throw new IllegalArgumentException("A send-back has at least one reason");
        }
        reasons = List.copyOf(reasons);
    }
}
