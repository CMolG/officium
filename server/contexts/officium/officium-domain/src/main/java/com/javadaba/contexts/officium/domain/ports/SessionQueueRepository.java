package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.QueuedCard;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** The cards queued into an account's agent sessions (JAVA-561). */
public interface SessionQueueRepository {

    /**
     * Puts the card at the END of the session's queue, taking it out of any queue it was in.
     *
     * @return the stored entry, with its position
     */
    QueuedCard enqueue(UUID cardId, String cardKey, UUID projectId, UUID accountId, String sessionId, Instant at);

    Optional<QueuedCard> find(UUID cardId);

    boolean remove(UUID cardId);

    /** Every entry of the account, by session, then queue order. */
    List<QueuedCard> ofAccount(UUID accountId);

    /**
     * Hands out the first card of the session's queue that no waiter holds (never delivered, or
     * delivered before {@code staleBefore} and never confirmed), marking it delivered at {@code now}.
     * Two waiters asking at once never get the same card.
     */
    Optional<QueuedCard> lease(UUID accountId, String sessionId, Instant now, Instant staleBefore);

    /** The waiter confirming the card it was handed: it leaves the queue. */
    boolean confirm(UUID accountId, String sessionId, UUID cardId);
}
