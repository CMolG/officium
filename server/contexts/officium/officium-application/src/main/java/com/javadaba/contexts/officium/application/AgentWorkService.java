package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.AgentRun;
import com.javadaba.contexts.officium.domain.CardRequest;
import com.javadaba.contexts.officium.domain.CardRules;
import com.javadaba.contexts.officium.domain.CardSearchCriteria;
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
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * "An agent is actively working on this card right now" and its live status lines (contract
 * §4.1), over {@link AgentWorkBoard}. Same access rules as any card write (editor+, not yours =
 * not found), but <strong>no {@code ActivityEntry} and no version bump</strong>: it only publishes
 * a {@code card.working} change event, and the board refetches {@link #active}.
 */
@ApplicationScoped
public class AgentWorkService {

    private final ProjectAccessGuard guard;
    private final ProjectService projects;
    private final CardService cards;
    private final ActivityPublisher activity;
    private final AgentWorkBoard board;
    private final AgentRunService runs;
    private final CardRequestRepository requests;
    private final EpicSweeps sweeps;
    private final CheckpointService checkpoints;
    private final Clock clock;
    private volatile boolean restored;

    @Inject
    public AgentWorkService(ProjectAccessGuard guard, ProjectService projects, CardService cards,
            ActivityPublisher activity, AgentRunService runs, CardRequestRepository requests, EpicSweeps sweeps,
            CheckpointService checkpoints) {
        this(guard, projects, cards, activity, runs, requests, sweeps, checkpoints, Clock.systemUTC());
    }

    /** {@code sweeps} null: every project executes card by card. */
    AgentWorkService(ProjectAccessGuard guard, ProjectService projects, CardService cards, ActivityPublisher activity,
            AgentRunService runs, CardRequestRepository requests, EpicSweeps sweeps, CheckpointService checkpoints,
            Clock clock) {
        this.guard = guard;
        this.projects = projects;
        this.cards = cards;
        this.activity = activity;
        this.runs = runs;
        this.requests = requests;
        this.sweeps = sweeps;
        this.checkpoints = checkpoints;
        this.clock = clock;
        this.board = new AgentWorkBoard(clock);
    }

    /** The sweep's checkpoint write, which the MCP table reaches through this service (card://JAVA-1876). */
    public CheckpointService checkpoints() {
        return checkpoints;
    }

    /**
     * JAVA-515: the board lives in memory, so a restart of app-api emptied it while agents kept
     * working -- and a heartbeat only renews a session, never starts one, so their cards stayed dark
     * until the next "start" write. Its first use after start-up puts back every run still alive;
     * from there the heartbeat and the writes renew them like any other session.
     */
    private AgentWorkBoard board() {
        if (!restored) {
            synchronized (board) {
                if (!restored) {
                    runs.live().forEach(live -> board.restore(live.run().projectId(), live.run().cardId(),
                            live.cardKey(), live.run().agent(), live.run().startedAt(), live.run().lastSeenAt()));
                    restored = true;
                }
            }
        }
        return board;
    }

    public List<AgentWorkView> active(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return board().active(projectId);
    }

    /**
     * JAVA-1586, JAVA-1668: whether the session working the card {@code workingOn} (its key) is a review: the card is
     * in Review and this account has a live session on it (see {@link ReviewCreationGuard}). A write naming no card
     * is not judged.
     */
    public boolean reviewing(UUID accountId, UUID projectId, String workingOn) {
        if (workingOn == null || workingOn.isBlank()) {
            return false;
        }
        CardView card = cards.get(accountId, projectId, workingOn.strip());
        return ReviewCreationGuard.reviewing(active(accountId, projectId), card.id(), card.status(), accountId);
    }

    /** JAVA-561: whether an agent of {@code accountId} is working the card right now. No access check:
     *  the caller asks about a card its own window was handed. */
    public boolean isWorking(UUID accountId, UUID projectId, UUID cardId) {
        return board().active(projectId).stream()
                .anyMatch(view -> view.cardId().equals(cardId) && accountId.equals(view.actor().accountId()));
    }

    /**
     * {@code cards.next} (JAVA-372), minus the cards an agent is on right now. A To do card leaves
     * its column when taken, but a Review or Refine card is worked where it stands, so without this
     * two loops would review the same card. A session that dies lapses, and its card comes back.
     *
     * <p>JAVA-1122: a card whose request a person has answered comes first, oldest request first:
     * its agent freed its slot while waiting, and the answer is what it was waiting for.
     */
    public Optional<CardView> next(UUID accountId, UUID projectId, boolean beyondSprint) {
        return next(accountId, projectId, beyondSprint, List.of());
    }

    /** card://JAVA-1786: the card a slot holds, so its session starts on that card's run whatever its phase. */
    public CardView card(UUID accountId, UUID projectId, String key) {
        return cards.get(accountId, projectId, key);
    }

    /**
     * {@link #next(UUID, UUID, boolean)} minus {@code excludedKeys}: the cards other slots of the machine hold (JAVA-1786),
     * so the run the answer names is the run of a card the asking slot can claim. A key that is no card of the project
     * leaves nothing out.
     */
    public Optional<CardView> next(UUID accountId, UUID projectId, boolean beyondSprint, List<String> excludedKeys) {
        Set<UUID> working = working(accountId, projectId, excludedKeys);
        return answered(accountId, projectId, working).or(() -> ranked(accountId, projectId, beyondSprint, working));
    }

    /**
     * {@link #next} as a unit of work (card://JAVA-1874): in a project that executes by epic, a card of an open epic
     * answers its epic with the sweep it is worked in, and an epic another session holds passes with all its cards.
     */
    public Optional<WorkPick> pick(UUID accountId, UUID projectId, boolean beyondSprint, List<String> excludedKeys) {
        if (sweeps == null || !sweeps.epicMode(projectId)) {
            return next(accountId, projectId, beyondSprint, excludedKeys).map(WorkPick::alone);
        }
        Set<UUID> working = working(accountId, projectId, excludedKeys);
        Optional<CardView> answered = answered(accountId, projectId, working);
        return answered.isPresent()
                ? answered.map(WorkPick::alone)
                : sweeps.pick(projectId, working,
                        skip -> ranked(accountId, projectId, beyondSprint, skip),
                        key -> cards.get(accountId, projectId, key));
    }

    /** {@link #card} as the unit the slot holding it works: its epic and sweep in a project that executes by epic. */
    public WorkPick unit(UUID accountId, UUID projectId, String key) {
        CardView card = card(accountId, projectId, key);
        return sweeps == null
                ? WorkPick.alone(card)
                : sweeps.unitOf(projectId, card, found -> cards.get(accountId, projectId, found));
    }

    private Set<UUID> working(UUID accountId, UUID projectId, List<String> excludedKeys) {
        Set<UUID> working = new HashSet<>();
        board().active(projectId).forEach(view -> working.add(view.cardId()));
        for (String key : excludedKeys) {
            try {
                working.add(cards.get(accountId, projectId, key).id());
            } catch (OfficiumException unknown) {
                // Not a card of this project: nothing to leave out.
            }
        }
        return working;
    }

    private Optional<CardView> answered(UUID accountId, UUID projectId, Set<UUID> working) {
        for (CardRequest request : requests.live(projectId)) {
            if (request.status() == CardRequest.Status.OPEN || working.contains(request.cardId())) {
                continue;
            }
            CardView card = cards.get(accountId, projectId, request.cardId().toString());
            // A card closed (done or rejected) or handed to a person since the answer is no longer an agent's to resume.
            if (!Status.fromWire(card.status()).closed() && Executor.AI.wire().equals(card.executor())) {
                return Optional.of(card);
            }
        }
        return Optional.empty();
    }

    private Optional<CardView> ranked(UUID accountId, UUID projectId, boolean beyondSprint, Set<UUID> skip) {
        Optional<CardView> inSprint = cards.next(accountId, projectId, skip, false);
        // JAVA-1146: a sprint that is all blocked sends the agent on, only when it asks.
        return inSprint.isPresent() || !beyondSprint ? inSprint : cards.next(accountId, projectId, skip, true);
    }

    /**
     * JAVA-120: {@link #active} over every project the caller can see, archived ones included --
     * an agent can still be working a card there. Only projects with work come back, each session
     * joined to its card, so a surface that shows no board still has the title. A card deleted
     * while it was being worked is left out rather than failing the whole read.
     */
    public List<ProjectWorkView> activeEverywhere(UUID accountId) {
        List<ProjectWorkView> result = new ArrayList<>();
        for (ProjectView project : projects.list(accountId, null, false, null)) {
            List<WorkingCardView> items = new ArrayList<>();
            for (AgentWorkView work : board().active(project.id())) {
                try {
                    items.add(new WorkingCardView(work, cards.get(accountId, project.id(), work.cardId().toString())));
                } catch (OfficiumException deleted) {
                    // Its session expires on its own; the rest of the read still stands.
                }
            }
            if (!items.isEmpty()) {
                result.add(new ProjectWorkView(project, items));
            }
        }
        return result;
    }

    /** One project's share of {@link #activeEverywhere}. */
    public record ProjectWorkView(ProjectView project, List<WorkingCardView> items) {
    }

    public record WorkingCardView(AgentWorkView work, CardView card) {
    }

    /** @return the live session, or empty once stopped. */
    public Optional<AgentWorkView> setActivelyWorking(UUID accountId, UUID projectId, String cardKeyOrId,
            boolean activelyWorking, Actor actor) {
        CardView card = requireRunnableCard(accountId, projectId, cardKeyOrId);
        if (!activelyWorking) {
            // Stopping is always allowed, so a session left on an epic from before JAVA-292 can end.
            runs.stopped(card.id(), actor);
            if (board().stop(projectId, card.id())) {
                publish(projectId, card, actor);
            }
            return Optional.empty();
        }
        requireWorkable(projectId, card);
        runs.started(projectId, card.id(), actor);
        AgentWorkView view = board().start(projectId, card.id(), card.key(), actor);
        publish(projectId, card, actor);
        return Optional.of(view);
    }

    public AgentWorkView reportStatus(UUID accountId, UUID projectId, String cardKeyOrId, String text, Actor actor) {
        if (text == null || text.isBlank()) {
            throw OfficiumException.badRequest("status_text_required", "A status needs text");
        }
        CardView card = requireRunnableCard(accountId, projectId, cardKeyOrId);
        requireWorkable(projectId, card);
        runs.started(projectId, card.id(), actor);
        AgentWorkView view = board().report(projectId, card.id(), card.key(), actor, text);
        publish(projectId, card, actor);
        return view;
    }

    /**
     * JAVA-186: a heartbeat from the harness of {@code accountId}'s agent on {@code machine} -- every
     * session it has live there is renewed and its run seen, so a long command neither lapses the
     * session nor loses its time (JAVA-50). The board only refetches when a line was added; the model and
     * effort it names (JAVA-584) ride along with that refetch.
     *
     * @return the keys of the cards it kept alive; empty when that machine is working none.
     */
    public List<String> beat(UUID accountId, String machine, String text, String model, String effort) {
        List<AgentWorkBoard.Beaten> beaten = board().beat(accountId, machine, text, model, effort);
        Instant now = Instant.now(clock);
        for (AgentWorkBoard.Beaten hit : beaten) {
            runs.seen(hit.cardId(), hit.actor());
            if (text != null && !text.isBlank()) {
                activity.publish("card.working", hit.projectId(), hit.cardId(), hit.cardKey(), null, hit.actor(), now);
            }
        }
        return beaten.stream().map(AgentWorkBoard.Beaten::cardKey).toList();
    }

    /** How many In progress cards {@link #resumable} looks at: a board, not a backlog. */
    static final int RESUMABLE_SCAN = 200;

    /**
     * JAVA-200: the cards a session on {@code machine} left in progress and nobody is working now --
     * its latest run came from that machine and has no live session on the board. That is what a
     * session that died mid-task leaves behind, and what the autoloop resumes before it picks a new
     * card. A card run from another machine is that machine's, never listed here.
     */
    public List<ResumableView> resumable(UUID accountId, UUID projectId, String machine) {
        if (machine == null || machine.isBlank()) {
            throw OfficiumException.badRequest("machine_required", "Say which machine to look for");
        }
        guard.requireAccess(projectId, accountId);
        List<CardView> doing = cards.search(accountId, projectId, new CardService.SearchRequest(null, Status.DOING,
                null, null, null, null, Executor.AI, null, null, null, CardSearchCriteria.Sort.ORDER, null,
                RESUMABLE_SCAN)).items();
        Set<UUID> live = new HashSet<>();
        board().active(projectId).forEach(view -> live.add(view.cardId()));
        Set<UUID> working = new HashSet<>(live);
        // JAVA-1122: a card whose request still waits on a person is waiting, not unfinished work.
        requests.live(projectId).stream().filter(request -> request.status() == CardRequest.Status.OPEN)
                .forEach(request -> working.add(request.cardId()));
        Map<UUID, CardView> candidates = new LinkedHashMap<>();
        doing.stream().filter(card -> !working.contains(card.id())).forEach(card -> candidates.put(card.id(), card));
        Map<UUID, AgentRun> latest = new HashMap<>();
        runs.latestOf(candidates.keySet()).forEach(run -> latest.put(run.cardId(), run));
        String wanted = machine.strip();
        List<ResumableView> left = candidates.values().stream()
                .filter(card -> latest.containsKey(card.id()))
                .filter(card -> wanted.equalsIgnoreCase(latest.get(card.id()).agent().machine()))
                .map(card -> new ResumableView(card, RunView.of(latest.get(card.id()))))
                .toList();
        return sweeps == null || !sweeps.epicMode(projectId)
                ? left
                : sweeps.asUnits(projectId, left, live, key -> cards.get(accountId, projectId, key));
    }

    public record ResumableView(CardView card, RunView lastRun) {
    }

    /** Wire shape of a card's agent run (contract §8.4). */
    public record RunView(ActorJson agent, String machine, Instant startedAt, Instant lastSeenAt, Instant endedAt) {

        static RunView of(AgentRun run) {
            return new RunView(ActorJson.of(run.agent()), run.agent().machine(), run.startedAt(), run.lastSeenAt(),
                    run.endedAt());
        }
    }

    /** What an agent's write to a card says about its work on it. */
    public enum Signal {
        STARTS, STOPS, CONTINUES;

        /** In progress is working on it; any other column is having put it down. */
        public static Signal ofMove(Status status) {
            return status == Status.DOING ? STARTS : STOPS;
        }

        public static Signal ofRunState(RunState runState) {
            return runState == RunState.RUNNING ? STARTS : STOPS;
        }
    }

    /**
     * JAVA-44 (user report, 2026-09-24: no card had ever lit up on the board). The indicator hung on
     * every agent remembering {@code cards.setActivelyWorking}, and on it reporting at least every
     * ten minutes; in practice neither happened. Now the agent's own writes say it: moving a card to
     * In progress or setting it running starts the session, moving it anywhere else or ending the
     * run stops it, and any other write to a card it is working renews it -- a write never STARTS a
     * session by itself, or an agent tidying twenty cards would light up twenty. Only the MCP
     * operations call this: a person's write says nothing about an agent. A human card is skipped,
     * since no agent runs one.
     */
    public void follow(UUID projectId, UUID cardId, String cardKey, String executor, Actor actor, Signal signal) {
        if (Executor.fromWire(executor) == Executor.HUMAN) {
            return;
        }
        // The run (JAVA-50) follows the same signals as the session: what lights the card up is what
        // is timed, so the board and the timesheet can't disagree about when an agent was working.
        boolean changed = switch (signal) {
            case STARTS -> {
                runs.started(projectId, cardId, actor);
                board().start(projectId, cardId, cardKey, actor);
                yield true;
            }
            case STOPS -> {
                runs.stopped(cardId, actor);
                yield board().stop(projectId, cardId);
            }
            case CONTINUES -> {
                runs.seen(cardId, actor);
                yield board().renew(projectId, cardId, actor);
            }
        };
        if (changed) {
            activity.publish("card.working", projectId, cardId, cardKey, null, actor, Instant.now(clock));
        }
    }

    public void follow(UUID projectId, CardView card, Actor actor, Signal signal) {
        // An epic is worked through its children (JAVA-292): moving one to In progress, which its
        // rules allow once it has children, says nothing about an agent working it.
        if (signal == Signal.STARTS && Category.EPIC.wire().equals(card.category())) {
            return;
        }
        follow(projectId, card.id(), card.key(), card.executor(), actor, signal);
    }

    /** {@link Signal#CONTINUES} for a write that answers with the card's id only (a comment, a time
     *  entry): renewing needs no executor, because only an AI card ever has a session to renew. */
    public void continues(UUID projectId, UUID cardId, Actor actor) {
        runs.seen(cardId, actor);
        if (board().renew(projectId, cardId, actor)) {
            activity.publish("card.working", projectId, cardId, null, null, actor, Instant.now(clock));
        }
    }

    private CardView requireRunnableCard(UUID accountId, UUID projectId, String cardKeyOrId) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        CardView card = cards.get(accountId, projectId, cardKeyOrId);
        // A human card is never run by an agent (JDB-239), so nobody can be actively working it.
        CardRules.requireRunnable(Executor.fromWire(card.executor()), RunState.RUNNING);
        return card;
    }

    /** An epic is worked directly only as a unit, in a project that executes by epic (card://JAVA-1874). */
    private void requireWorkable(UUID projectId, CardView card) {
        if (sweeps == null || !Category.EPIC.wire().equals(card.category()) || !sweeps.epicMode(projectId)) {
            CardRules.requireWorkable(card.category() == null ? null : Category.fromWire(card.category()),
                    RunState.RUNNING);
        }
    }

    private void publish(UUID projectId, CardView card, Actor actor) {
        activity.publish("card.working", projectId, card.id(), card.key(), null, actor, Instant.now(clock));
    }
}
