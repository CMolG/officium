package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * Every mutation appends one (contract §1.5). Carries the actor AND whether it was a person or an
 * agent -- "who moved this card" is the first question on a board shared with agents.
 */
public record ActivityEntry(UUID id, UUID projectId, UUID cardId, String cardKey, Actor actor,
        String operation, String summary, Instant at) {
}
