package com.javadaba.contexts.officium.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * An agent working a card, persisted so its time can be imputed when it ends (JAVA-50, contract
 * §8.4). The in-memory session of §4.1 says "working right now" to the people watching; this is
 * the record of how long it lasted.
 *
 * <p>The rule is the board's own: a run is alive while the agent shows signs of life at most
 * {@link #LAPSE} apart, the same ten minutes after which the board stops showing it as working.
 * A run nobody ends is closed at its last sign of life, never at the moment someone notices,
 * which would impute the hours the agent spent gone.
 */
public record AgentRun(UUID id, UUID projectId, UUID cardId, Actor agent, Instant startedAt, Instant lastSeenAt,
        Instant endedAt) {

    public static final Duration LAPSE = Duration.ofMinutes(10);

    /** Shorter than this imputes nothing: an agent that picks a card up and puts it down worked no time. */
    public static final Duration MINIMUM = Duration.ofMinutes(1);

    public AgentRun {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(cardId, "cardId");
        Objects.requireNonNull(agent, "agent");
        Objects.requireNonNull(startedAt, "startedAt");
        Objects.requireNonNull(lastSeenAt, "lastSeenAt");
    }

    public static AgentRun start(UUID projectId, UUID cardId, Actor agent, Instant now) {
        return new AgentRun(UUID.randomUUID(), projectId, cardId, agent, now, now, null);
    }

    /** Has it gone {@link #LAPSE} without a sign of life by {@code now}? */
    public boolean lapsedAt(Instant now) {
        return !lastSeenAt.plus(LAPSE).isAfter(now);
    }

    /** When it ends if it ends {@code now}: now while alive, its last sign of life once lapsed. */
    public Instant endFor(Instant now) {
        return lapsedAt(now) ? lastSeenAt : now;
    }

    /** Whether {@code [start, end)} is worth imputing: under {@link #MINIMUM} it is nobody's work. How
     *  it is split into entries is {@link TimeSplit}'s. */
    public static boolean worthImputing(Instant start, Instant end) {
        return end != null && Duration.between(start, end).compareTo(MINIMUM) >= 0;
    }
}
