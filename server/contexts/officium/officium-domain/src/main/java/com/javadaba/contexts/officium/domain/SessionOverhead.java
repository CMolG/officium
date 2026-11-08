package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * Usage no card picked up (card://JAVA-1047): an interactive window, a refine conversation, the waiter, a subagent
 * without a card. It belongs to its project's period as overhead, and it is never a card's time entry, so every
 * reader of a card's time keeps meaning "a card's". {@code attended} says whether a person had a window open; null
 * when nobody said.
 */
public record SessionOverhead(UUID id, UUID projectId, UUID accountId, String sessionRef, String subagent,
        String model, String effort, Instant startedAt, Instant endedAt, TokenUsage tokens, Boolean attended) {

    public SessionOverhead {
        if (projectId == null || sessionRef == null || sessionRef.isBlank()) {
            throw new IllegalArgumentException("overhead belongs to a project and a session");
        }
        tokens = tokens == null ? TokenUsage.ZERO : tokens;
    }
}
