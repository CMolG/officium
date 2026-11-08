package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.PrecedenceDefaults;
import com.javadaba.contexts.officium.domain.PrecedenceRule;
import com.javadaba.contexts.officium.domain.PrecedenceRules;
import com.javadaba.contexts.officium.domain.PrecedenceSprint;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.Sprint;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.PrecedenceRepository;
import com.javadaba.contexts.officium.domain.ports.SprintRepository;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * What a project's precedence rules do to a card as it enters a rule (ADR 0032, JAVA-1686): a priority floor,
 * and for {@code sprint: join} the active sprint. A card is in the first rule its facets match, the way
 * {@code cards.next} ranks it. An explicit priority or sprint in the same request always wins, and a save that
 * leaves a card in the rule it was in does nothing. Each change is written in the card's history, by rule name.
 */
final class CardPrecedence {

    /** The project's rules with the epics they resolve against; empty when the project has none. */
    record Ranking(List<PrecedenceRule> rules, List<PrecedenceRules.Resolved> resolved) {

        /** The first rule the facets match, or empty. */
        Optional<PrecedenceRule> of(Category category, String epic, List<String> tags, List<Signal> signals) {
            int rank = PrecedenceRules.rankOf(category, epic, tags == null ? List.of() : tags,
                    signals == null ? List.of() : signals, resolved);
            return rank == 0 ? Optional.empty() : Optional.of(rules.get(rank - 1));
        }
    }

    /**
     * What a card gets from its rule: the priority it ends at, the sprint it is in, the rule that applied (null
     * when none did), whether the rule raised its priority, and the sprint it joined (null when none).
     */
    record Outcome(Priority priority, UUID sprintId, PrecedenceRule rule, boolean raised, Sprint joined) {
    }

    private final PrecedenceRepository precedence;
    private final CardRepository cards;
    private final SprintRepository sprints;
    private final SprintPlacement placement;
    private final ActivityPublisher activity;
    private final Clock clock;

    CardPrecedence(PrecedenceRepository precedence, CardRepository cards, SprintRepository sprints,
            SprintPlacement placement, ActivityPublisher activity, Clock clock) {
        this.precedence = precedence;
        this.cards = cards;
        this.sprints = sprints;
        this.placement = placement;
        this.activity = activity;
        this.clock = clock;
    }

    /** The project's rules, read once: a batch ranks every card it creates against the same list. */
    Ranking rankingOf(UUID projectId) {
        return rankingOf(precedence, cards, projectId);
    }

    /** The project's ranking, read from the store: the rules, and the project's cards only when a rule names an epic. */
    static Ranking rankingOf(PrecedenceRepository precedence, CardRepository cards, UUID projectId) {
        List<PrecedenceRule> rules = precedence.find(projectId).map(PrecedenceRepository.Stored::rules)
                .orElse(List.of());
        if (rules.isEmpty()) {
            return new Ranking(List.of(), List.of());
        }
        boolean namesEpics = rules.stream().anyMatch(rule -> !rule.match().epics().isEmpty());
        List<Card> epicsFrom = namesEpics ? cards.findAllByProject(projectId) : List.of();
        return new Ranking(rules, PrecedenceRules.resolve(rules, epicsFrom));
    }

    /**
     * A card about to be created: the priority it starts at and the sprint it lands in. {@code requested} and
     * {@code requestedSprint} are what the request said (null = not said); the sprint is already checked open.
     */
    Outcome onCreate(Ranking ranking, UUID projectId, Category category, String epic, List<String> tags,
            List<Signal> signals, Priority requested, UUID requestedSprint) {
        Optional<PrecedenceRule> rule = ranking.of(category, epic, tags, signals);
        if (rule.isEmpty()) {
            return new Outcome(requested == null ? Priority.MEDIUM : requested, requestedSprint, null, false, null);
        }
        Priority priority = requested != null ? requested : floor(Priority.MEDIUM, rule.get());
        Sprint joined = joinTarget(projectId, category, requestedSprint, rule.get());
        return new Outcome(priority, joined == null ? requestedSprint : joined.id(), rule.get(),
                requested == null && priority != Priority.MEDIUM, joined);
    }

    /**
     * A content edit about to be saved: the priority it ends at. The rules are read only when the edit moved the
     * card's epic, tags, category or signals, and only a change of rule applies its defaults. An edit that named
     * a priority keeps it.
     */
    Outcome onEdit(UUID projectId, Card current, Card edited, boolean explicitPriority) {
        Outcome unchanged = new Outcome(edited.priority(), current.sprintId(), null, false, null);
        if (!facetsChanged(current, edited)) {
            return unchanged;
        }
        Ranking ranking = rankingOf(projectId);
        Optional<PrecedenceRule> after = ranking.of(edited.category(), edited.epic(), edited.tags(), edited.signals());
        Optional<PrecedenceRule> before = ranking.of(current.category(), current.epic(), current.tags(),
                current.signals());
        if (after.isEmpty() || after.map(PrecedenceRule::id).equals(before.map(PrecedenceRule::id))) {
            return unchanged;
        }
        Priority priority = explicitPriority ? edited.priority() : floor(edited.priority(), after.get());
        return new Outcome(priority, current.sprintId(), after.get(), priority != edited.priority(), null);
    }

    /**
     * A saved edit: the sprint its rule joins when the card is not planned yet, and the history of what the rule
     * changed. Returns the card as it now is, which is {@code saved} unless it joined a sprint.
     */
    Card afterEdit(UUID projectId, Card saved, Outcome outcome, Actor actor) {
        if (outcome.rule() == null) {
            return saved;
        }
        Sprint joined = joinTarget(projectId, saved.category(), saved.sprintId(), outcome.rule());
        Card result = joined == null
                ? saved
                : placement.plan(projectId, saved, joined.id(), cards.sprintOrder(projectId, joined.id()).size(), actor,
                        "card.precedence", joinedText(joined, outcome.rule())).orElse(saved);
        if (outcome.raised()) {
            activity.record(projectId, result.id(), result.key(), actor, "card.precedence",
                    raisedText(outcome.priority(), outcome.rule()), Instant.now(clock));
        }
        return result;
    }

    /** A card just created into its rule: its history says what the rule did to it. */
    void recordCreated(Card created, Outcome outcome, Actor actor, Instant now) {
        if (outcome.rule() == null) {
            return;
        }
        if (outcome.raised()) {
            activity.record(created.projectId(), created.id(), created.key(), actor, "card.precedence",
                    raisedText(outcome.priority(), outcome.rule()), now);
        }
        if (outcome.joined() != null) {
            activity.record(created.projectId(), created.id(), created.key(), actor, "card.precedence",
                    joinedText(outcome.joined(), outcome.rule()), now);
        }
    }

    /** The active sprint a card joins when its rule says so: an unplanned card, not an epic. */
    private Sprint joinTarget(UUID projectId, Category category, UUID sprintId, PrecedenceRule rule) {
        boolean wantsJoin = rule.defaults() != null && rule.defaults().sprint() == PrecedenceSprint.JOIN
                && category != Category.EPIC;
        return wantsJoin && sprintId == null ? sprints.findActive(projectId).orElse(null) : null;
    }

    /** The rule's priority floor when it is higher than {@code current}; otherwise {@code current}, never lower. */
    private static Priority floor(Priority current, PrecedenceRule rule) {
        PrecedenceDefaults defaults = rule.defaults();
        if (defaults == null || defaults.priority() == null || defaults.priority().rank() >= current.rank()) {
            return current;
        }
        return defaults.priority();
    }

    private static boolean facetsChanged(Card before, Card after) {
        return !Objects.equals(before.epic(), after.epic()) || !before.tags().equals(after.tags())
                || before.category() != after.category() || !before.signals().equals(after.signals());
    }

    private static String raisedText(Priority priority, PrecedenceRule rule) {
        return "Priority raised to " + label(priority) + " by the rule \"" + rule.name() + "\"";
    }

    static String joinedText(Sprint joined, PrecedenceRule rule) {
        return "Added to " + joined.name() + " by the rule \"" + rule.name() + "\"";
    }

    private static String label(Priority priority) {
        return switch (priority) {
            case SUPER_HIGH -> "Super high";
            case HIGH -> "High";
            case MEDIUM -> "Medium";
            case LOW -> "Low";
            case SUPER_LOW -> "Super low";
        };
    }
}
