package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.ReviewOutcome;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** The review-outcome log (card://JAVA-1526): every exit of a card from review. Append-only. */
public interface ReviewOutcomeRepository {

    void insert(ReviewOutcome outcome);

    /** Each listed card's review exits, oldest first, keyed by card. */
    Map<UUID, List<ReviewOutcome>> listByCards(Collection<UUID> cardIds);

    /** The project's review exits in {@code [from, to)}, oldest first: what one period of metrics reads. */
    List<ReviewOutcome> listByProjectBetween(UUID projectId, Instant from, Instant to);

    /** Every review exit of the project, oldest first. */
    List<ReviewOutcome> listByProject(UUID projectId);
}
