package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * A card queued into one of an account's open agent sessions (JAVA-561, contract §4.3): the board
 * says "work this next in that window", and the window's waiter takes it. Backlog state, so it is
 * persisted and survives a restart; the session it names may be offline meanwhile.
 *
 * <p>A card is in at most one queue. {@code position} orders a session's queue; only its relative
 * order means anything. {@code deliveredAt} is set while a waiter holds the card and has not yet
 * confirmed it: a waiter that dies with it in hand leaves it to be delivered again, never lost.
 */
public record QueuedCard(UUID cardId, String cardKey, UUID projectId, UUID accountId, String sessionId,
        long position, Instant queuedAt, Instant deliveredAt) {

    /** Claude Code's {@code session_id} is a UUID; anything an agent client may use as a stable id fits. */
    private static final Pattern SESSION_ID = Pattern.compile("[A-Za-z0-9_-]{1,128}");

    public QueuedCard {
        Objects.requireNonNull(cardId, "cardId");
        Objects.requireNonNull(cardKey, "cardKey");
        Objects.requireNonNull(projectId, "projectId");
        Objects.requireNonNull(accountId, "accountId");
        requireSessionId(sessionId);
        Objects.requireNonNull(queuedAt, "queuedAt");
    }

    /** @return the id, stripped, or {@code 400 invalid_session} for one a client must not send. */
    public static String requireSessionId(String sessionId) {
        String id = sessionId == null ? "" : sessionId.strip();
        if (!SESSION_ID.matcher(id).matches()) {
            throw OfficiumException.badRequest("invalid_session",
                    "A session id is 1 to 128 letters, digits, '-' or '_': the session_id the agent's client reports");
        }
        return id;
    }
}
