package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * What a board needs to catch up (JAVA-45): the cards that changed, the ones deleted, and the
 * instant to ask from next time. {@code asOf} is the database's clock, never the client's -- the
 * two can disagree by minutes.
 */
public record CardChanges(List<Card> cards, List<UUID> removed, Instant asOf) {
}
