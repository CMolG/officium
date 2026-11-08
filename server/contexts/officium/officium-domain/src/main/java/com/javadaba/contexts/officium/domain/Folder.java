package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.UUID;

/** An optional, nestable grouping of projects. Owned by one account (v1: no sharing at the
 *  folder level -- membership is per-{@link Project}). */
public record Folder(UUID id, UUID ownerAccountId, UUID parentId, String name, Instant createdAt,
        Instant updatedAt) {
}
