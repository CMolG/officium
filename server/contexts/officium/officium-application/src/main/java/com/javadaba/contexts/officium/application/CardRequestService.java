package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.ActorKind;
import com.javadaba.contexts.officium.domain.CardRequest;
import com.javadaba.contexts.officium.domain.CardRules;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.RunState;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.CardRequestRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * JAVA-1122: an agent working a card asks its person for one quick action and waits on the answer,
 * instead of opening a human card for something that takes a minute ("open a tmux session").
 *
 * <p>An agent opens it (never a person), on an AI card that can be worked. A person who can edit
 * the project answers it, Done or Can't now, with an optional short note; that is the only way it
 * leaves {@code open}. The agent closes it once it resumes, or to withdraw it. Each step goes into
 * the card's history and is published as {@code card.request}, so the board shows it live.
 *
 * <p>The agent waits through {@link #waitFor}: a long-poll its harness script holds with the
 * account's heartbeat token, answered asynchronously the moment the person answers, like the
 * session waiter ({@link SessionQueueService}). Waiters live in this instance's memory; the request
 * itself is persisted, so a waiter that reconnects after a restart still reads the answer.
 */
@ApplicationScoped
public class CardRequestService {

    /** Longest a wait call is held open: under the edge's 60 s write timeout, like the session waiter. */
    public static final Duration MAX_WAIT = SessionQueueService.MAX_WAIT;

    private final CardRequestRepository requests;
    private final CardService cards;
    private final ProjectAccessGuard guard;
    private final HeartbeatService heartbeat;
    private final ActivityPublisher activity;
    private final Clock clock;
    private final Map<UUID, Set<CompletableFuture<Boolean>>> waiters = new ConcurrentHashMap<>();
    private volatile boolean draining;

    @Inject
    public CardRequestService(CardRequestRepository requests, CardService cards, ProjectAccessGuard guard,
            HeartbeatService heartbeat, ActivityPublisher activity) {
        this(requests, cards, guard, heartbeat, activity, Clock.systemUTC());
    }

    CardRequestService(CardRequestRepository requests, CardService cards, ProjectAccessGuard guard,
            HeartbeatService heartbeat, ActivityPublisher activity, Clock clock) {
        this.requests = requests;
        this.cards = cards;
        this.guard = guard;
        this.heartbeat = heartbeat;
        this.activity = activity;
        this.clock = clock;
    }

    /** What an agent asks for: one line, and optionally the steps or command and why it is blocked. */
    public record NewRequest(String action, String detail, String why) {
    }

    public CardRequestView open(UUID accountId, UUID projectId, String keyOrId, NewRequest ask, Actor actor) {
        if (actor.kind() != ActorKind.AGENT) {
            throw OfficiumException.forbidden("request_agent_only",
                    "Only an agent opens a request; a person asks another person with a card");
        }
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        CardView card = cards.get(accountId, projectId, keyOrId);
        CardRules.requireRunnable(Executor.fromWire(card.executor()), RunState.RUNNING);
        CardRules.requireWorkable(card.category() == null ? null : Category.fromWire(card.category()),
                RunState.RUNNING);
        CardRules.requireOpen(Status.fromWire(card.status()));
        Instant now = Instant.now(clock);
        CardRequest request = CardRequest.open(projectId, card.id(), ask.action(), ask.detail(), ask.why(), actor,
                now);
        if (!requests.insert(request)) {
            throw OfficiumException.conflict("request_exists", card.key() + " already has a request that is not "
                    + "closed: read it with cards.requests, and close it before asking again");
        }
        changed(projectId, card, actor, "card.request", "Waiting for you: " + request.action(), now);
        return view(request, card);
    }

    /** The project's requests waiting on a person, or answered and waiting on their agent. */
    public List<CardRequestView> live(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return requests.live(projectId).stream().map(request -> view(request,
                cards.get(accountId, projectId, request.cardId().toString()))).toList();
    }

    public CardRequestView get(UUID accountId, UUID projectId, UUID requestId) {
        guard.requireAccess(projectId, accountId);
        CardRequest request = require(projectId, requestId);
        return view(request, cards.get(accountId, projectId, request.cardId().toString()));
    }

    /** A person's answer: {@code done} or {@code declined}. Only an open request takes one. */
    public CardRequestView answer(UUID accountId, UUID projectId, UUID requestId, String answer, String note,
            Actor actor) {
        if (actor.kind() != ActorKind.PERSON) {
            throw OfficiumException.forbidden("request_person_only", "An agent never answers its own request");
        }
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        CardRequest.Status status = answerStatus(answer);
        String cleanNote = CardRequest.note(note);
        CardRequest request = require(projectId, requestId);
        Instant now = Instant.now(clock);
        if (request.status() != CardRequest.Status.OPEN || !requests.answer(requestId, status, actor, cleanNote, now)) {
            throw OfficiumException.conflict("request_not_open", "This request was already answered or closed");
        }
        CardView card = cards.get(accountId, projectId, request.cardId().toString());
        changed(projectId, card, actor, "card.request.answered",
                (status == CardRequest.Status.DONE ? "Answered Done: " : "Answered Can't now: ") + request.action(),
                now);
        wake(requestId);
        return get(accountId, projectId, requestId);
    }

    /** The agent resumed, or withdraws the request. Closing a closed request changes nothing. */
    public CardRequestView close(UUID accountId, UUID projectId, UUID requestId, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        CardRequest request = require(projectId, requestId);
        Instant now = Instant.now(clock);
        CardView card = cards.get(accountId, projectId, request.cardId().toString());
        if (requests.close(requestId, now)) {
            changed(projectId, card, actor, "card.request.closed", "Request closed: " + request.action(), now);
            wake(requestId);
        }
        return view(require(projectId, requestId), card);
    }

    /**
     * The agent's harness waiting on an answer, with the account's heartbeat token: answers at once
     * when the request is no longer open, else holds up to {@code wait} ({@link #MAX_WAIT} at most)
     * and answers empty when nothing changed.
     */
    public CompletableFuture<Optional<CardRequestView>> waitFor(String token, UUID requestId, Duration wait) {
        UUID accountId = heartbeat.accountFor(token);
        CardRequest request = requests.find(requestId)
                .orElseThrow(CardRequestService::notFound);
        guard.requireAccess(request.projectId(), accountId);
        Duration held = wait == null || wait.isNegative()
                ? Duration.ZERO
                : wait.compareTo(cap()) > 0 ? cap() : wait;
        if (request.status() != CardRequest.Status.OPEN || held.isZero()) {
            return CompletableFuture.completedFuture(answered(accountId, request));
        }
        CompletableFuture<Boolean> signal = new CompletableFuture<>();
        Set<CompletableFuture<Boolean>> mine = waiters.computeIfAbsent(requestId, key -> ConcurrentHashMap.newKeySet());
        mine.add(signal);
        // Answered between the read above and the registration: the wake already ran, so look again.
        requests.find(requestId).filter(now -> now.status() != CardRequest.Status.OPEN)
                .ifPresent(now -> signal.complete(true));
        return signal.completeOnTimeout(false, held.toMillis(), TimeUnit.MILLISECONDS).thenApplyAsync(woken -> {
            mine.remove(signal);
            return requests.find(requestId).flatMap(latest -> answered(accountId, latest));
        });
    }

    /** The API is stopping (JAVA-1096): answers every held wait at once, empty, and holds later ones briefly. */
    public void drain() {
        draining = true;
        waiters.values().forEach(set -> set.forEach(signal -> signal.complete(false)));
    }

    private Duration cap() {
        return draining ? SessionQueueService.DRAIN_WAIT : MAX_WAIT;
    }

    private Optional<CardRequestView> answered(UUID accountId, CardRequest request) {
        return request.status() == CardRequest.Status.OPEN
                ? Optional.empty()
                : Optional.of(view(request, cards.get(accountId, request.projectId(), request.cardId().toString())));
    }

    private void wake(UUID requestId) {
        Set<CompletableFuture<Boolean>> waiting = waiters.remove(requestId);
        if (waiting != null) {
            waiting.forEach(signal -> signal.complete(true));
        }
    }

    private void changed(UUID projectId, CardView card, Actor actor, String operation, String summary,
            Instant now) {
        activity.record(projectId, card.id(), card.key(), actor, operation, summary, now);
        activity.publish("card.request", projectId, card.id(), card.key(), null, actor, now);
    }

    private CardRequest require(UUID projectId, UUID requestId) {
        return requests.find(requestId).filter(request -> request.projectId().equals(projectId))
                .orElseThrow(CardRequestService::notFound);
    }

    private static CardRequest.Status answerStatus(String answer) {
        if ("done".equals(answer)) {
            return CardRequest.Status.DONE;
        }
        if ("declined".equals(answer)) {
            return CardRequest.Status.DECLINED;
        }
        throw OfficiumException.badRequest("request_answer_invalid", "Answer `done` or `declined`");
    }

    private static OfficiumException notFound() {
        return OfficiumException.notFound("request_not_found", "No such request in this project");
    }

    private static CardRequestView view(CardRequest request, CardView card) {
        return new CardRequestView(request.id(), request.projectId(), request.cardId(), card.key(), card.title(),
                request.action(), request.detail(), request.why(), request.status().wire(),
                ActorJson.of(request.createdBy()), request.createdAt(),
                request.answeredBy() == null ? null : ActorJson.of(request.answeredBy()), request.answeredAt(),
                request.note(), request.closedAt());
    }

    /** {@code status} is {@code open}, {@code done}, {@code declined} or {@code closed}. */
    public record CardRequestView(UUID id, UUID projectId, UUID cardId, String cardKey, String cardTitle,
            String action, String detail, String why, String status, ActorJson createdBy, Instant createdAt,
            ActorJson answeredBy, Instant answeredAt, String note, Instant closedAt) {
    }
}
