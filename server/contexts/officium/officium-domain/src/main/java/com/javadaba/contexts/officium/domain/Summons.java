package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * One open round of asking a person to answer what their agents wait on (JAVA-1145). A round is
 * started by an agent's {@code summons.send}; the person's snooze and the summons being seen are kept
 * on it. {@code itemIds} name what the round covered when it started, so a new item can be told apart.
 * {@code askedAt} is the last time an agent sent it, whatever the answer: a summons is shown only
 * while an agent is still asking.
 */
public record Summons(UUID id, UUID projectId, UUID accountId, List<String> itemIds, int round, Instant summonedAt,
        String summonedBy, boolean delivered, Instant shownAt, Instant seenAt, Instant snoozedUntil, Instant closedAt,
        String closeReason, Instant askedAt) {

    public Summons {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(projectId, "projectId");
        Objects.requireNonNull(accountId, "accountId");
        Objects.requireNonNull(summonedAt, "summonedAt");
        itemIds = List.copyOf(itemIds);
        if (askedAt == null) {
            askedAt = summonedAt;
        }
    }

    /** The same summons, a new round: what is pending now, delivered or not, and nothing seen yet. */
    public Summons nextRound(List<String> items, Instant at, String machine, boolean delivered) {
        return new Summons(id, projectId, accountId, items, round + 1, at, machine, delivered, null, null, null, null,
                null, at);
    }

    /** An agent asked again and nothing changed. */
    public Summons asked(Instant at) {
        return new Summons(id, projectId, accountId, itemIds, round, summonedAt, summonedBy, delivered, shownAt,
                seenAt, snoozedUntil, closedAt, closeReason, at);
    }

    public Summons shown(Instant at, boolean seen) {
        return new Summons(id, projectId, accountId, itemIds, round, summonedAt, summonedBy, delivered,
                shownAt == null ? at : shownAt, seen && seenAt == null ? at : seenAt, snoozedUntil, closedAt,
                closeReason, askedAt);
    }

    public Summons snoozed(Instant until) {
        return new Summons(id, projectId, accountId, itemIds, round, summonedAt, summonedBy, delivered, shownAt,
                seenAt, until, closedAt, closeReason, askedAt);
    }

    public Summons closed(Instant at, String reason) {
        return new Summons(id, projectId, accountId, itemIds, round, summonedAt, summonedBy, delivered, shownAt,
                seenAt, snoozedUntil, at, reason, askedAt);
    }

    public boolean snoozedAt(Instant now) {
        return snoozedUntil != null && snoozedUntil.isAfter(now);
    }
}
