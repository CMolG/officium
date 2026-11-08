package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.CardRules;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.QueuedCard;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.RunState;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.SessionQueueRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * JAVA-561 (contract §4.3): the board queues cards into one of the caller's OWN open agent windows,
 * and the window's waiter -- a background command the harness starts -- takes them one at a time.
 *
 * <p><strong>The queue is backlog state, the sessions are presence.</strong> What is queued where is
 * persisted ({@link SessionQueueRepository}) and survives a restart; which windows are open lives in
 * memory, like {@link ProjectMachineService}: an API restart forgets them and the waiter registers
 * again on its next call. Same single-instance caveat as the SSE bus.
 *
 * <p><strong>Never across accounts.</strong> A session belongs to the account whose heartbeat token
 * registered it, and only that account sees it or queues into it; another account's session answers
 * {@code 404 session_not_found}, so not even its existence leaks. Being an editor of the card's
 * project is required too, but never enough.
 *
 * <p><strong>No free text.</strong> A waiter is handed a card key and its project, never a prompt:
 * the board is not a way to make someone's agent run arbitrary instructions.
 *
 * <p>JAVA-562: a window also reports what its status line shows ({@link WindowTelemetry}) and when it
 * waits on its person ({@code blocked}). Both are personal and both stay on the presence, so only its
 * own account's {@link #list} ever returns them.
 */
@ApplicationScoped
public class SessionQueueService {

    /** Longest a waiter's call is held open. Under the edge's 60 s write timeout (contract §4). */
    public static final Duration MAX_WAIT = Duration.ofSeconds(50);
    /** Longest a wait is held once the API is stopping: it ends inside the shutdown delay (JAVA-1096). */
    static final Duration DRAIN_WAIT = Duration.ofSeconds(2);
    /** A handed-out card the waiter never confirmed is handed out again after this. */
    static final Duration LEASE = Duration.ofSeconds(60);
    /** The gap between two waiter calls a live waiter never exceeds: past it, the window is offline. */
    static final Duration OFFLINE_AFTER = Duration.ofSeconds(30);
    /** How long a card just handed over counts as being worked before its agent session must show. */
    static final Duration DELIVERY_GRACE = Duration.ofMinutes(10);
    /** An offline window with nothing queued is forgotten after this. */
    static final Duration FORGET_AFTER = Duration.ofDays(1);
    /** Windows one account may have in memory: a person has a handful open, never dozens. */
    static final int MAX_WINDOWS = 20;
    private static final int LABEL_MAX = 120;
    /** What can make a window wait on its person: a permission prompt, or a question an MCP server asked. */
    static final Set<String> BLOCKED_REASONS = Set.of("permission_prompt", "elicitation_dialog");

    private final HeartbeatService heartbeat;
    private final SessionQueueRepository queue;
    private final ProjectAccessGuard guard;
    private final CardService cards;
    private final AgentWorkService agentWork;
    private final ActivityPublisher activity;
    private final Clock clock;
    private final Map<UUID, Map<String, Presence>> sessions = new ConcurrentHashMap<>();
    private volatile boolean draining;

    @Inject
    public SessionQueueService(HeartbeatService heartbeat, SessionQueueRepository queue, ProjectAccessGuard guard,
            CardService cards, AgentWorkService agentWork, ActivityPublisher activity) {
        this(heartbeat, queue, guard, cards, agentWork, activity, Clock.systemUTC());
    }

    SessionQueueService(HeartbeatService heartbeat, SessionQueueRepository queue, ProjectAccessGuard guard,
            CardService cards, AgentWorkService agentWork, ActivityPublisher activity, Clock clock) {
        this.heartbeat = heartbeat;
        this.queue = queue;
        this.guard = guard;
        this.cards = cards;
        this.agentWork = agentWork;
        this.activity = activity;
        this.clock = clock;
    }

    // ── the waiter's side (heartbeat token) ─────────────────────────────────────────────────

    /** A window opening, or its waiter coming back after an API restart. Idempotent. */
    public SessionView register(String token, String sessionId, String machine, String label) {
        UUID accountId = heartbeat.accountFor(token);
        String id = QueuedCard.requireSessionId(sessionId);
        String cleanMachine = clean(machine, 100);
        String cleanLabel = clean(label, LABEL_MAX);
        Instant now = Instant.now(clock);
        Map<String, Presence> mine = sessions.computeIfAbsent(accountId, key -> new ConcurrentHashMap<>());
        Presence presence = mine.get(id);
        if (presence == null) {
            synchronized (mine) {
                presence = mine.get(id);
                if (presence == null) {
                    makeRoom(accountId, mine, now);
                    presence = new Presence(id, now);
                    mine.put(id, presence);
                }
            }
        }
        synchronized (presence) {
            presence.machine = cleanMachine != null ? cleanMachine : presence.machine;
            presence.label = cleanLabel != null ? cleanLabel : presence.label;
            presence.lastSeenAt = now;
        }
        return view(accountId, presence, queuedOf(accountId, id), now);
    }

    /**
     * The waiter asking for its next card, held open up to {@code wait} while there is none. A call
     * also says the window finished whatever card it was handed before. A newer call from the same
     * window answers the older one {@link Next#REPLACED}: a card is never handed to a dead waiter's
     * call, and a window that started a second waiter makes the first one stop instead of the two
     * taking turns.
     */
    public CompletableFuture<Next> next(String token, String sessionId, Duration wait) {
        UUID accountId = heartbeat.accountFor(token);
        Presence presence = requirePresence(accountId, QueuedCard.requireSessionId(sessionId));
        Duration held = wait == null || wait.isNegative()
                ? Duration.ZERO
                : wait.compareTo(cap()) > 0 ? cap() : wait;
        CompletableFuture<Boolean> signal = new CompletableFuture<>();
        CompletableFuture<Boolean> previous;
        synchronized (presence) {
            previous = presence.waiter;
            presence.waiter = signal;
            presence.current = null;
            presence.lastSeenAt = Instant.now(clock);
        }
        if (previous != null) {
            previous.complete(false);
        }
        Optional<Delivery> now = take(accountId, presence, signal);
        if (now.isPresent() || held.isZero()) {
            release(presence, signal);
            return CompletableFuture.completedFuture(now.map(Next::handed).orElse(Next.NOTHING));
        }
        return signal.completeOnTimeout(true, held.toMillis(), TimeUnit.MILLISECONDS)
                .thenApplyAsync(look -> {
                    if (!look) {
                        return Next.REPLACED;
                    }
                    Optional<Delivery> delivery = take(accountId, presence, signal);
                    release(presence, signal);
                    return delivery.map(Next::handed).orElse(Next.NOTHING);
                });
    }

    /**
     * The API is stopping (JAVA-1096): answers every held wait at once, empty, and holds later ones
     * at most {@link #DRAIN_WAIT}. The edge lets a wait last up to {@link #MAX_WAIT}, so without
     * this a deploy would cut every open window's call mid-wait.
     */
    public void drain() {
        draining = true;
        sessions.values().forEach(mine -> mine.values().forEach(presence -> {
            CompletableFuture<Boolean> waiter;
            synchronized (presence) {
                waiter = presence.waiter;
            }
            if (waiter != null) {
                waiter.complete(true);
            }
        }));
    }

    private Duration cap() {
        return draining ? DRAIN_WAIT : MAX_WAIT;
    }

    /** The waiter confirming the card it was handed, once its window has it: it leaves the queue. */
    public void confirm(String token, String sessionId, UUID cardId) {
        UUID accountId = heartbeat.accountFor(token);
        String id = QueuedCard.requireSessionId(sessionId);
        if (cardId == null || !queue.confirm(accountId, id, cardId)) {
            throw OfficiumException.notFound("delivery_not_found",
                    "This window holds no such card: it was never handed to it, or was confirmed already");
        }
    }

    /**
     * What the window's status line shows now. It never counts as the waiter being alive: a window
     * with no waiter must not look ready to take a card because its status line keeps drawing.
     */
    public void report(String token, String sessionId, WindowTelemetry telemetry) {
        Presence presence = requirePresence(heartbeat.accountFor(token), QueuedCard.requireSessionId(sessionId));
        if (telemetry == null) {
            return;
        }
        WindowTelemetry clean = telemetry.sanitized(Instant.now(clock));
        synchronized (presence) {
            presence.telemetry = clean;
        }
    }

    /** The window waiting on its person (a permission prompt, a question), or no longer waiting. */
    public void attention(String token, String sessionId, boolean blocked, String reason) {
        Presence presence = requirePresence(heartbeat.accountFor(token), QueuedCard.requireSessionId(sessionId));
        synchronized (presence) {
            presence.blockedSince = blocked ? Instant.now(clock) : null;
            presence.blockedReason = blocked && reason != null && BLOCKED_REASONS.contains(reason) ? reason : null;
        }
    }

    // ── the board's side (the person's session, or MCP) ─────────────────────────────────────

    /** The caller's own windows, live ones first, each with its queue. Never anyone else's. */
    public List<SessionView> list(UUID accountId) {
        Instant now = Instant.now(clock);
        Map<String, List<QueuedCard>> queued = new LinkedHashMap<>();
        for (QueuedCard entry : queue.ofAccount(accountId)) {
            queued.computeIfAbsent(entry.sessionId(), key -> new ArrayList<>()).add(entry);
        }
        Map<String, Presence> mine = sessions.getOrDefault(accountId, Map.of());
        mine.values().removeIf(presence -> !queued.containsKey(presence.id) && forgotten(presence, now));
        List<SessionView> views = new ArrayList<>();
        mine.values().forEach(presence -> views.add(view(accountId, presence,
                queued.getOrDefault(presence.id, List.of()), now)));
        // A queue whose window this instance never saw (an API restart) still shows, offline, so its
        // cards can be taken out.
        queued.forEach((id, entries) -> {
            if (!mine.containsKey(id)) {
                views.add(new SessionView(id, null, null, SessionState.OFFLINE.wire(), null, null, null, null, 0,
                        entries.stream().map(QueuedCardView::of).toList(), null));
            }
        });
        views.sort(Comparator.comparing((SessionView view) -> SessionState.valueOf(
                view.state().toUpperCase(java.util.Locale.ROOT))).thenComparing(SessionView::lastSeenAt,
                        Comparator.nullsLast(Comparator.reverseOrder())));
        return views;
    }

    /**
     * Queues the card at the end of one of the caller's windows; a card already in another of the
     * caller's queues moves. Editor+ on the project, an agent's card, never an epic nor a closed one.
     */
    public QueuedCardView queue(UUID accountId, UUID projectId, String cardKeyOrId, String sessionId, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        CardView card = cards.get(accountId, projectId, cardKeyOrId);
        CardRules.requireRunnable(Executor.fromWire(card.executor()), RunState.RUNNING);
        CardRules.requireWorkable(card.category() == null ? null : Category.fromWire(card.category()),
                RunState.RUNNING);
        CardRules.requireOpen(Status.fromWire(card.status()));
        String id = QueuedCard.requireSessionId(sessionId);
        Map<String, Presence> mine = sessions.getOrDefault(accountId, Map.of());
        if (!mine.containsKey(id) && queuedOf(accountId, id).isEmpty()) {
            throw sessionNotFound();
        }
        Optional<QueuedCard> existing = queue.find(card.id());
        if (existing.isPresent() && !existing.get().accountId().equals(accountId)) {
            throw OfficiumException.conflict("card_queued_elsewhere",
                    "Someone else has queued this card into one of their agent windows");
        }
        Instant now = Instant.now(clock);
        QueuedCard entry = queue.enqueue(card.id(), card.key(), projectId, accountId, id, now);
        Presence presence = mine.get(id);
        if (presence != null) {
            CompletableFuture<Boolean> waiter;
            synchronized (presence) {
                waiter = presence.waiter;
            }
            if (waiter != null) {
                waiter.complete(true);
            }
        }
        activity.publish("card.queue", projectId, card.id(), card.key(), null, actor, now);
        return QueuedCardView.of(entry);
    }

    /** Takes the card out of the caller's queue. Someone else's entry answers as if there were none. */
    public void unqueue(UUID accountId, UUID projectId, String cardKeyOrId, Actor actor) {
        UUID cardId = cards.resolveCardId(accountId, projectId, cardKeyOrId);
        QueuedCard entry = queue.find(cardId)
                .filter(found -> found.accountId().equals(accountId) && found.projectId().equals(projectId))
                .orElseThrow(() -> OfficiumException.notFound("not_queued", "This card is in none of your queues"));
        queue.remove(cardId);
        activity.publish("card.queue", projectId, cardId, entry.cardKey(), null, actor, Instant.now(clock));
    }

    // ── internals ───────────────────────────────────────────────────────────────────────────

    /**
     * Keeps an account's windows at {@link #MAX_WINDOWS}, because they live in this instance's memory
     * and registering costs only a free account's heartbeat token. Forgotten windows go first, then
     * the offline window seen longest ago; one holding queued cards is never dropped. With every slot
     * live or holding cards, the new window is refused. Called under the account map's monitor.
     */
    private void makeRoom(UUID accountId, Map<String, Presence> mine, Instant now) {
        Set<String> holding = queue.ofAccount(accountId).stream().map(QueuedCard::sessionId)
                .collect(Collectors.toSet());
        mine.values().removeIf(presence -> !holding.contains(presence.id) && forgotten(presence, now));
        if (mine.size() < MAX_WINDOWS) {
            return;
        }
        Presence evicted = mine.values().stream()
                .filter(presence -> !holding.contains(presence.id) && offline(accountId, presence, now))
                .min(Comparator.comparing(this::lastSeen))
                .orElseThrow(() -> new OfficiumException("too_many_windows", "This account already has "
                        + MAX_WINDOWS + " agent windows open or holding cards: close one, or take its cards out,"
                        + " before opening another", 429));
        mine.remove(evicted.id);
    }

    private boolean offline(UUID accountId, Presence presence, Instant now) {
        synchronized (presence) {
            return state(accountId, presence, now) == SessionState.OFFLINE;
        }
    }

    private Instant lastSeen(Presence presence) {
        synchronized (presence) {
            return presence.lastSeenAt;
        }
    }

    /** The first card of the window's queue its agent can still work; the rest are dropped on the way. */
    private Optional<Delivery> take(UUID accountId, Presence presence, CompletableFuture<Boolean> signal) {
        synchronized (presence) {
            if (presence.waiter != signal) {
                return Optional.empty();
            }
        }
        while (true) {
            Instant now = Instant.now(clock);
            Optional<QueuedCard> leased = queue.lease(accountId, presence.id, now, now.minus(LEASE));
            if (leased.isEmpty()) {
                return Optional.empty();
            }
            QueuedCard entry = leased.get();
            if (!workable(accountId, entry)) {
                queue.remove(entry.cardId());
                continue;
            }
            synchronized (presence) {
                presence.current = new Presence.Current(entry.cardId(), entry.cardKey(), entry.projectId(), now);
                presence.cardsWorked++;
                presence.lastSeenAt = now;
            }
            return Optional.of(new Delivery(entry.cardId(), entry.cardKey(), entry.projectId()));
        }
    }

    /** What changed since it was queued may have made it a card no agent works now. */
    private boolean workable(UUID accountId, QueuedCard entry) {
        try {
            guard.requireAtLeast(entry.projectId(), accountId, Role.EDITOR);
            CardView card = cards.get(accountId, entry.projectId(), entry.cardId().toString());
            return Executor.fromWire(card.executor()) != Executor.HUMAN
                    && !Category.EPIC.wire().equals(card.category())
                    && !Status.fromWire(card.status()).closed();
        } catch (OfficiumException gone) {
            return false;
        }
    }

    private void release(Presence presence, CompletableFuture<Boolean> signal) {
        synchronized (presence) {
            if (presence.waiter == signal) {
                presence.waiter = null;
                presence.lastSeenAt = Instant.now(clock);
            }
        }
    }

    private Presence requirePresence(UUID accountId, String id) {
        Presence presence = sessions.getOrDefault(accountId, Map.of()).get(id);
        if (presence == null) {
            throw sessionNotFound();
        }
        return presence;
    }

    private List<QueuedCard> queuedOf(UUID accountId, String id) {
        return queue.ofAccount(accountId).stream().filter(entry -> entry.sessionId().equals(id)).toList();
    }

    private SessionView view(UUID accountId, Presence presence, List<QueuedCard> queued, Instant now) {
        synchronized (presence) {
            SessionState state = state(accountId, presence, now);
            return new SessionView(presence.id, presence.label, presence.machine, state.wire(),
                    presence.registeredAt, presence.lastSeenAt,
                    presence.current == null ? null : CurrentCardView.of(presence.current),
                    state == SessionState.BLOCKED ? presence.blockedReason : null, presence.cardsWorked,
                    queued.stream().map(QueuedCardView::of).toList(), presence.telemetry);
        }
    }

    /** Working: it was handed a card and its agent is on it (or only just got it). Idle: its waiter is
     *  connected, or only between two calls. Offline: neither. Blocked: working or idle, but waiting on
     *  its person -- offline still wins, because nothing then vouches the window is open at all. */
    private SessionState state(UUID accountId, Presence presence, Instant now) {
        SessionState live = liveState(accountId, presence, now);
        return live != SessionState.OFFLINE && presence.blockedSince != null ? SessionState.BLOCKED : live;
    }

    private SessionState liveState(UUID accountId, Presence presence, Instant now) {
        if (presence.current != null && (presence.current.deliveredAt().plus(DELIVERY_GRACE).isAfter(now)
                || agentWork.isWorking(accountId, presence.current.projectId(), presence.current.cardId()))) {
            return SessionState.WORKING;
        }
        if (presence.current == null
                && (presence.waiter != null || presence.lastSeenAt.plus(OFFLINE_AFTER).isAfter(now))) {
            return SessionState.IDLE;
        }
        return SessionState.OFFLINE;
    }

    private boolean forgotten(Presence presence, Instant now) {
        synchronized (presence) {
            return presence.waiter == null && presence.lastSeenAt.plus(FORGET_AFTER).isBefore(now);
        }
    }

    private static OfficiumException sessionNotFound() {
        return OfficiumException.notFound("session_not_found",
                "No such agent window of yours. A window shows up once its waiter is running");
    }

    private static String clean(String value, int max) {
        if (value == null) {
            return null;
        }
        String stripped = value.replaceAll("\\p{Cntrl}", " ").strip();
        if (stripped.isEmpty()) {
            return null;
        }
        return stripped.length() > max ? stripped.substring(0, max) : stripped;
    }

    // ── shapes ──────────────────────────────────────────────────────────────────────────────

    /** In the order the board lists them: the one waiting on its person first. */
    public enum SessionState {
        BLOCKED, WORKING, IDLE, OFFLINE;

        public String wire() {
            return name().toLowerCase(java.util.Locale.ROOT);
        }
    }

    /** What a waiter is handed: a card to work, never text to obey. */
    public record Delivery(UUID cardId, String cardKey, UUID projectId) {
    }

    /** A waiter call's answer: a card, nothing within the wait, or a newer waiter of the same window
     *  took over and this one must stop. */
    public record Next(Delivery card, boolean replaced) {
        public static final Next NOTHING = new Next(null, false);
        public static final Next REPLACED = new Next(null, true);

        static Next handed(Delivery card) {
            return new Next(card, false);
        }
    }

    /** {@code state} is {@code blocked}, {@code working}, {@code idle} or {@code offline};
     *  {@code blockedReason} is set only while blocked; {@code telemetry} is null until the window's
     *  status line reports. */
    public record SessionView(String sessionId, String label, String machine, String state,
            Instant registeredAt, Instant lastSeenAt, CurrentCardView currentCard, String blockedReason,
            int cardsWorked, List<QueuedCardView> queue, WindowTelemetry telemetry) {
    }

    public record CurrentCardView(UUID cardId, String cardKey, UUID projectId, Instant deliveredAt) {
        static CurrentCardView of(Presence.Current current) {
            return new CurrentCardView(current.cardId(), current.cardKey(), current.projectId(), current.deliveredAt());
        }
    }

    public record QueuedCardView(UUID cardId, String cardKey, UUID projectId, String sessionId, long position,
            Instant queuedAt, boolean delivered) {
        static QueuedCardView of(QueuedCard entry) {
            return new QueuedCardView(entry.cardId(), entry.cardKey(), entry.projectId(), entry.sessionId(),
                    entry.position(), entry.queuedAt(), entry.deliveredAt() != null);
        }
    }
}
