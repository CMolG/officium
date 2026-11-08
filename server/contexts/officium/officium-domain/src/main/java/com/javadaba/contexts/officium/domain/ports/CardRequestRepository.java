package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.CardRequest;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CardRequestRepository {

    /** {@code false} when the card already holds a request that is not closed (nothing is written). */
    boolean insert(CardRequest request);

    /** By id alone: the caller checks the project, because a waiter knows only the request. */
    Optional<CardRequest> find(UUID requestId);

    /** The project's requests that are not closed, oldest first. */
    List<CardRequest> live(UUID projectId);

    /** Records the person's answer; {@code false} when the request is no longer open. */
    boolean answer(UUID requestId, CardRequest.Status answer, Actor answeredBy, String note, Instant at);

    /** Closes whatever request the card still holds (its card was deleted); nothing when it holds none. */
    void closeForCard(UUID cardId, Instant at);

    /** Closes it; {@code false} when it was closed already. */
    boolean close(UUID requestId, Instant at);
}
