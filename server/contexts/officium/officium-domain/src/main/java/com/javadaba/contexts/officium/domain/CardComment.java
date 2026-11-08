package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.UUID;

/** {@code parentId}: the comment of the same card this one replies to, null at the top level (JAVA-524). */
public record CardComment(UUID id, UUID cardId, Actor author, String text, Instant createdAt,
        Instant updatedAt, UUID parentId) {

    /** A top-level comment. */
    public CardComment(UUID id, UUID cardId, Actor author, String text, Instant createdAt, Instant updatedAt) {
        this(id, cardId, author, text, createdAt, updatedAt, null);
    }
}
