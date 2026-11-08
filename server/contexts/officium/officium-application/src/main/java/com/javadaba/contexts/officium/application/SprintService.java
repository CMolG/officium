package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.Sprint;
import com.javadaba.contexts.officium.domain.SprintState;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.SprintRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Sprints (JAVA-53, contract §8.2): planned, active, closed. The rules one sprint can check live on
 * {@link Sprint}; the ones that need the others -- a single active sprint, where the unfinished
 * cards of a completed one go -- live here.
 */
@ApplicationScoped
public class SprintService {

    /** {@code moveOpenCardsTo} when the unfinished cards go back to the backlog. */
    public static final String TO_BACKLOG = "backlog";

    private final SprintRepository sprints;
    private final CardRepository cards;
    private final CardService cardService;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final Clock clock;

    @Inject
    public SprintService(SprintRepository sprints, CardRepository cards, CardService cardService,
            ProjectAccessGuard guard, ActivityPublisher activity) {
        this(sprints, cards, cardService, guard, activity, Clock.systemUTC());
    }

    SprintService(SprintRepository sprints, CardRepository cards, CardService cardService, ProjectAccessGuard guard,
            ActivityPublisher activity, Clock clock) {
        this.sprints = sprints;
        this.cards = cards;
        this.cardService = cardService;
        this.guard = guard;
        this.activity = activity;
        this.clock = clock;
    }

    /** Active first, then the planned ones in their order, then the closed ones newest first. */
    public List<SprintView> list(UUID accountId, UUID projectId, SprintState state) {
        guard.requireAccess(projectId, accountId);
        Map<UUID, SprintRepository.Counts> counts = sprints.counts(projectId);
        return sprints.listByProject(projectId).stream()
                .filter(s -> state == null || s.state() == state)
                .sorted(Comparator.comparingInt((Sprint s) -> switch (s.state()) {
                    case ACTIVE -> 0;
                    case PLANNED -> 1;
                    case CLOSED -> 2;
                }).thenComparingInt(s -> s.state() == SprintState.PLANNED ? s.order() : 0)
                        .thenComparing(s -> s.closedAt() == null ? Instant.MIN : s.closedAt(),
                                Comparator.reverseOrder()))
                .map(s -> view(s, counts))
                .toList();
    }

    public SprintView get(UUID accountId, UUID projectId, UUID sprintId) {
        guard.requireAccess(projectId, accountId);
        return view(require(projectId, sprintId));
    }

    public SprintView create(UUID accountId, UUID projectId, String name, String goal, LocalDate startDate,
            LocalDate endDate, Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Project project = access.project();
        int number = sprints.nextNumber(projectId);
        int order = (int) sprints.listByProject(projectId).stream().filter(s -> s.state() == SprintState.PLANNED)
                .count();
        Instant now = Instant.now(clock);
        String resolvedName = name == null || name.isBlank()
                ? Sprint.defaultName(project.keyPrefix(), number)
                : name.strip();
        Sprint created = sprints.insert(new Sprint(UUID.randomUUID(), projectId, number, resolvedName, goal,
                SprintState.PLANNED, startDate, endDate, null, null, order, 1, now, now));
        record(projectId, actor, "sprint.created", "Sprint \"" + created.name() + "\" created", now);
        return view(created);
    }

    public SprintView update(UUID accountId, UUID projectId, UUID sprintId, int expectedVersion, String name,
            String goal, LocalDate startDate, LocalDate endDate, Integer order, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Sprint current = require(projectId, sprintId);
        Instant now = Instant.now(clock);
        Sprint desired = current.edited(name, goal, startDate, endDate, now);
        if (order != null && order != current.order()) {
            if (current.state() != SprintState.PLANNED) {
                throw OfficiumException.conflict("sprint_not_planned", "Only planned sprints are reordered");
            }
            desired = reorderPlanned(projectId, desired, order, now);
        }
        return applyVersioned(current, desired, expectedVersion, actor, "sprint.updated", "Sprint updated");
    }

    /** Moves one planned sprint to {@code position} among the planned ones, keeping them dense. */
    private Sprint reorderPlanned(UUID projectId, Sprint moving, int position, Instant now) {
        List<Sprint> others = sprints.listByProject(projectId).stream()
                .filter(s -> s.state() == SprintState.PLANNED && !s.id().equals(moving.id()))
                .sorted(Comparator.comparingInt(Sprint::order))
                .toList();
        int clamped = Math.max(0, Math.min(position, others.size()));
        for (int i = 0; i < others.size(); i++) {
            int newOrder = i < clamped ? i : i + 1;
            Sprint other = others.get(i);
            if (other.order() != newOrder) {
                sprints.updateIfVersion(other.reordered(newOrder, now), other.version());
            }
        }
        return new Sprint(moving.id(), moving.projectId(), moving.number(), moving.name(), moving.goal(),
                moving.state(), moving.startDate(), moving.endDate(), moving.startedAt(), moving.closedAt(), clamped,
                moving.version(), moving.createdAt(), moving.updatedAt());
    }

    public SprintView start(UUID accountId, UUID projectId, UUID sprintId, int expectedVersion, LocalDate startDate,
            LocalDate endDate, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Sprint current = require(projectId, sprintId);
        sprints.findActive(projectId).filter(active -> !active.id().equals(sprintId)).ifPresent(active -> {
            throw OfficiumException.conflict("sprint_already_active",
                    "\"" + active.name() + "\" is already active: complete it first");
        });
        Instant now = Instant.now(clock);
        Sprint started = current.started(startDate == null ? LocalDate.now(clock) : startDate, endDate, now);
        return applyVersioned(current, started, expectedVersion, actor, "sprint.started",
                "Sprint \"" + current.name() + "\" started");
    }

    /**
     * Closes the active sprint and sends its unfinished cards where the caller says: the backlog or
     * a planned sprint. No default -- which one is a planning decision (contract §8.2). Finished
     * cards stay in the closed sprint, which is what comparing sprints later reads.
     */
    public CompletedSprint complete(UUID accountId, UUID projectId, UUID sprintId, int expectedVersion,
            String moveOpenCardsTo, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Sprint current = require(projectId, sprintId);
        if (moveOpenCardsTo == null || moveOpenCardsTo.isBlank()) {
            throw OfficiumException.badRequest("move_target_required",
                    "Say where the unfinished cards go: \"backlog\" or a planned sprint's id");
        }
        UUID target = TO_BACKLOG.equals(moveOpenCardsTo) ? null : parseSprintId(moveOpenCardsTo);
        if (target != null) {
            Sprint destination = require(projectId, target);
            if (destination.state() != SprintState.PLANNED) {
                throw OfficiumException.conflict("sprint_not_planned", "Unfinished cards go to a planned sprint");
            }
        }
        Instant now = Instant.now(clock);
        SprintView closed = applyVersioned(current, current.completed(now), expectedVersion, actor,
                "sprint.completed", "Sprint \"" + current.name() + "\" completed");
        List<Card> open = cards.sprintOrder(projectId, sprintId).stream()
                .map(id -> cards.findById(projectId, id).orElse(null))
                .filter(c -> c != null && !c.status().finished() && !c.status().closed())
                .toList();
        List<UUID> openIds = open.stream().map(Card::id).toList();
        cards.reassignSprint(projectId, openIds, target, now, actor);
        cardService.reindexAll(projectId, openIds);
        for (Card card : open) {
            activity.publish("card.updated", projectId, card.id(), card.key(), card.version() + 1, actor, now);
        }
        return new CompletedSprint(closed, open.stream().map(Card::key).toList());
    }

    /** Only a planned sprint; its cards go back to the backlog, at its end, in their order. */
    public void delete(UUID accountId, UUID projectId, UUID sprintId, int expectedVersion, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Sprint current = require(projectId, sprintId);
        current.requireDeletable();
        if (current.version() != expectedVersion) {
            throw new SprintVersionConflictException(view(current));
        }
        Instant now = Instant.now(clock);
        List<UUID> planned = cards.sprintOrder(projectId, sprintId);
        cards.reassignSprint(projectId, planned, null, now, actor);
        if (!sprints.deleteIfVersion(projectId, sprintId, expectedVersion)) {
            throw new SprintVersionConflictException(view(require(projectId, sprintId)));
        }
        cardService.reindexAll(projectId, planned);
        record(projectId, actor, "sprint.deleted", "Sprint \"" + current.name() + "\" deleted", now);
    }

    public record CompletedSprint(SprintView sprint, List<String> moved) {
    }

    private SprintView applyVersioned(Sprint current, Sprint desired, int expectedVersion, Actor actor,
            String operation, String summary) {
        if (current.version() != expectedVersion) {
            throw new SprintVersionConflictException(view(current));
        }
        if (!sprints.updateIfVersion(desired, expectedVersion)) {
            Sprint fresh = require(current.projectId(), current.id());
            if (desired.state() == SprintState.ACTIVE && fresh.version() == expectedVersion) {
                throw OfficiumException.conflict("sprint_already_active", "Another sprint is already active");
            }
            throw new SprintVersionConflictException(view(fresh));
        }
        record(current.projectId(), actor, operation, summary, desired.updatedAt());
        return view(desired);
    }

    private void record(UUID projectId, Actor actor, String operation, String summary, Instant at) {
        activity.record(projectId, null, null, actor, operation, summary, at);
        activity.publish("sprint.changed", projectId, null, null, null, actor, at);
    }

    private Sprint require(UUID projectId, UUID sprintId) {
        return sprints.findById(projectId, sprintId)
                .orElseThrow(() -> OfficiumException.notFound("sprint_not_found", "No such sprint"));
    }

    private static UUID parseSprintId(String raw) {
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException ex) {
            throw OfficiumException.badRequest("move_target_required",
                    "moveOpenCardsTo is \"backlog\" or a planned sprint's id");
        }
    }

    private SprintView view(Sprint sprint) {
        return view(sprint, sprints.counts(sprint.projectId()));
    }

    private static SprintView view(Sprint sprint, Map<UUID, SprintRepository.Counts> counts) {
        return SprintView.of(sprint, counts.getOrDefault(sprint.id(), SprintRepository.Counts.EMPTY));
    }
}
