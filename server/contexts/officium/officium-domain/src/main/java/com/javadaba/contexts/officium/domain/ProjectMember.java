package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.UUID;

public record ProjectMember(UUID projectId, UUID accountId, Role role, Instant createdAt) {
}
