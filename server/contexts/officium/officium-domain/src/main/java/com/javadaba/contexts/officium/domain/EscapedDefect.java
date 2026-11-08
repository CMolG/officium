package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * One defect that escaped an origin card's delivery (card://JAVA-1525): the corrective card that names it in its
 * lineage, the origin's phase that let it through, the quality dimension and the rules, who recorded it and when.
 * Append-only, one per (origin, corrective) pair: the origin's {@code qualityRegressionTriggered}.
 */
public record EscapedDefect(UUID id, UUID projectId, UUID originCardId, UUID correctiveCardId,
        String correctiveKey, Instant at, Actor actor, EscapedPhase escapedIn, QualityDimension dimension,
        List<QualityRule> rules) {

    public EscapedDefect {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(originCardId, "originCardId");
        Objects.requireNonNull(correctiveCardId, "correctiveCardId");
        Objects.requireNonNull(at, "at");
        Objects.requireNonNull(escapedIn, "escapedIn");
        Objects.requireNonNull(dimension, "dimension");
        rules = rules == null ? List.of() : List.copyOf(rules);
    }
}
