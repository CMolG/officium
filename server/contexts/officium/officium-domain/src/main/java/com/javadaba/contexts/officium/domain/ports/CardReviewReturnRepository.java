package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.ReviewReturn;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** The send-back log (card://JAVA-1416). Append-only: entries are written with the move, by {@link CardRepository}. */
public interface CardReviewReturnRepository {

    /** One card's send-backs, oldest first. */
    List<ReviewReturn> listByCard(UUID cardId);

    /** {@link #listByCard} for a whole list in one read, keyed by card. */
    Map<UUID, List<ReviewReturn>> listByCards(Collection<UUID> cardIds);

    /** Every send-back of the project, oldest first. */
    List<ReviewReturn> listByProject(UUID projectId);
}
