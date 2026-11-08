package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Which cards an agent is <em>actively working</em> on right now, and the status lines it reports
 * while it does. <strong>Monitoring, not record</strong>: nothing here reaches the database, the
 * card's {@code version} or its activity history -- the same single-instance, in-process caveat
 * as {@link ProjectEventBroadcaster} (contract §4).
 *
 * <p>A session <strong>expires</strong> {@link #TTL} after its last beat (starting, or reporting a
 * status). An agent that crashes mid-task never calls "stop", and a card left pulsing forever
 * would be a lie on the board; expiring keeps the indicator honest without trusting the agent to
 * clean up after itself.
 */
public final class AgentWorkBoard {

    static final Duration TTL = Duration.ofMinutes(10);
    static final int MAX_STATUSES = 50;
    static final int MAX_STATUS_LENGTH = 500;

    private final Map<UUID, Map<UUID, Session>> byProject = new HashMap<>();
    private final Clock clock;
    private final Duration ttl;

    public AgentWorkBoard(Clock clock) {
        this(clock, TTL);
    }

    AgentWorkBoard(Clock clock, Duration ttl) {
        this.clock = clock;
        this.ttl = ttl;
    }

    /** Starts (or renews) the session. Idempotent: calling it again keeps the status lines. */
    public synchronized AgentWorkView start(UUID projectId, UUID cardId, String cardKey, Actor actor) {
        return view(beat(projectId, cardId, cardKey, actor));
    }

    /** Appends a status line, starting the session if there was none -- reporting progress on a
     *  card is, by definition, working on it. */
    public synchronized AgentWorkView report(UUID projectId, UUID cardId, String cardKey, Actor actor, String text) {
        String line = text == null ? "" : text.strip();
        if (line.isEmpty()) {
            throw new IllegalArgumentException("A status needs text");
        }
        Session session = beat(projectId, cardId, cardKey, actor);
        addStatus(session, truncate(line));
        return view(session);
    }

    private static void addStatus(Session session, String line) {
        session.statuses.addFirst(new AgentWorkView.StatusLine(line, session.updatedAt));
        while (session.statuses.size() > MAX_STATUSES) {
            session.statuses.removeLast();
        }
    }

    private static String truncate(String line) {
        return line.length() > MAX_STATUS_LENGTH ? line.substring(0, MAX_STATUS_LENGTH) : line;
    }

    /** Renews a live session's expiry; never starts one. @return whether there was one. */
    public synchronized boolean renew(UUID projectId, UUID cardId, Actor actor) {
        Session session = live(projectId).get(cardId);
        if (session == null) {
            return false;
        }
        session.actor = actor.rememberingMachineOf(session.actor);
        session.updatedAt = Instant.now(clock);
        return true;
    }

    /**
     * JAVA-186: a harness heartbeat. Every live session an agent of {@code accountId} runs on
     * {@code machine} is renewed and, when {@code text} is given, gets it as a status line -- under
     * the session's OWN actor, since the beat only says which machine it comes from. Never starts a
     * session: a card lights up through the agent's MCP writes, and a beat only keeps it lit. A beat
     * that names the model and effort the agent runs on (JAVA-584) sets them on the session; one that
     * doesn't keeps what an earlier one said.
     */
    public synchronized List<Beaten> beat(UUID accountId, String machine, String text, String model, String effort) {
        String line = text == null || text.isBlank() ? null : truncate(text.strip());
        Instant now = Instant.now(clock);
        List<Beaten> beaten = new ArrayList<>();
        for (UUID projectId : List.copyOf(byProject.keySet())) {
            for (Session session : live(projectId).values()) {
                if (!accountId.equals(session.actor.accountId())
                        || !machine.equalsIgnoreCase(session.actor.machine())) {
                    continue;
                }
                session.updatedAt = now;
                if (line != null) {
                    addStatus(session, line);
                }
                session.model = model == null ? session.model : model;
                session.effort = effort == null ? session.effort : effort;
                beaten.add(new Beaten(projectId, session.cardId, session.cardKey, session.actor));
            }
        }
        return beaten;
    }

    /** A session a heartbeat renewed, with the actor its time is imputed to. */
    public record Beaten(UUID projectId, UUID cardId, String cardKey, Actor actor) {
    }

    /**
     * JAVA-515: puts back a session a restart lost, from its persisted run -- same start, same last
     * sign of life, so it lapses when it would have. Never over a live session, and a run already past
     * the TTL stays gone. The status lines were never persisted and don't come back.
     */
    public synchronized void restore(UUID projectId, UUID cardId, String cardKey, Actor actor, Instant startedAt,
            Instant lastSeenAt) {
        if (!lastSeenAt.plus(ttl).isAfter(Instant.now(clock)) || live(projectId).containsKey(cardId)) {
            return;
        }
        Session session = new Session(cardId, cardKey, startedAt);
        session.actor = actor;
        session.updatedAt = lastSeenAt;
        byProject.computeIfAbsent(projectId, key -> new HashMap<>()).put(cardId, session);
    }

    /** @return whether there was a live session to stop. */
    public synchronized boolean stop(UUID projectId, UUID cardId) {
        Map<UUID, Session> sessions = live(projectId);
        boolean removed = sessions.remove(cardId) != null;
        if (sessions.isEmpty()) {
            byProject.remove(projectId);
        }
        return removed;
    }

    public synchronized List<AgentWorkView> active(UUID projectId) {
        return live(projectId).values().stream()
                .sorted(Comparator.comparing((Session s) -> s.startedAt))
                .map(this::view)
                .toList();
    }

    private Session beat(UUID projectId, UUID cardId, String cardKey, Actor actor) {
        Instant now = Instant.now(clock);
        Map<UUID, Session> sessions = live(projectId);
        Session session = sessions.get(cardId);
        if (session == null) {
            session = new Session(cardId, cardKey, now);
            byProject.computeIfAbsent(projectId, key -> new HashMap<>()).put(cardId, session);
        }
        // A write that doesn't say where it runs keeps the machine an earlier one said (JAVA-200).
        session.actor = actor.rememberingMachineOf(session.actor);
        session.updatedAt = now;
        return session;
    }

    /** The project's sessions with the expired ones already dropped -- expiry is lazy, at read time. */
    private Map<UUID, Session> live(UUID projectId) {
        Map<UUID, Session> sessions = byProject.get(projectId);
        if (sessions == null) {
            return new HashMap<>();
        }
        Instant now = Instant.now(clock);
        sessions.values().removeIf(s -> !s.updatedAt.plus(ttl).isAfter(now));
        if (sessions.isEmpty()) {
            byProject.remove(projectId);
        }
        return sessions;
    }

    private AgentWorkView view(Session session) {
        return new AgentWorkView(session.cardId, session.cardKey, ActorJson.of(session.actor), session.startedAt,
                session.updatedAt, session.updatedAt.plus(ttl), new ArrayList<>(session.statuses), session.model,
                session.effort);
    }

    private static final class Session {
        private final UUID cardId;
        private final String cardKey;
        private final Instant startedAt;
        private final Deque<AgentWorkView.StatusLine> statuses = new ArrayDeque<>();
        private Actor actor;
        private Instant updatedAt;
        private String model;
        private String effort;

        private Session(UUID cardId, String cardKey, Instant startedAt) {
            this.cardId = cardId;
            this.cardKey = cardKey;
            this.startedAt = startedAt;
            this.updatedAt = startedAt;
        }
    }
}
