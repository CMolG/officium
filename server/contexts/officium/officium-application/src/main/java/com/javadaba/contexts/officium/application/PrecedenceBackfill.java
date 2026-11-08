package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.PrecedenceRule;
import com.javadaba.contexts.officium.domain.PrecedenceRules;
import com.javadaba.contexts.officium.domain.PrecedenceSprint;
import com.javadaba.contexts.officium.domain.Sprint;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.PrecedenceRepository;
import com.javadaba.contexts.officium.domain.ports.SprintRepository;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.BiConsumer;

import static java.util.stream.Collectors.toMap;

/**
 * The backfill of a saved rule (JAVA-1691, ADR 0032 section 5): the open cards the rule ranks that sit outside the
 * active sprint, moved into it. {@link #plan} reads and saves nothing; {@link #apply} moves the cards in one
 * transaction, and a second apply finds nothing left to move.
 */
final class PrecedenceBackfill {

    /** The cards a rule would bring in, the sprint they would join, and each planned card's current sprint name. */
    record Plan(PrecedenceRule rule, Sprint active, List<Card> cards, Map<UUID, String> sprintNames) {

        /** The name of the sprint a card sits in, or null for the backlog. */
        String sprintNameOf(Card card) {
            return card.sprintId() == null ? null : sprintNames.get(card.sprintId());
        }
    }

    /** What an apply moved: the rule, the sprint its cards joined, and their keys in card-number order. */
    record Applied(PrecedenceRule rule, Sprint active, List<String> moved) {
    }

    private final PrecedenceRepository precedence;
    private final CardRepository cards;
    private final SprintRepository sprints;
    private final ActivityPublisher activity;
    private final BiConsumer<UUID, List<UUID>> reindex;
    private final Clock clock;

    PrecedenceBackfill(PrecedenceRepository precedence, CardRepository cards, SprintRepository sprints,
            ActivityPublisher activity, BiConsumer<UUID, List<UUID>> reindex, Clock clock) {
        this.precedence = precedence;
        this.cards = cards;
        this.sprints = sprints;
        this.activity = activity;
        this.reindex = reindex;
        this.clock = clock;
    }

    /** The open cards the rule ranks that are not in the active sprint, in card-number order. */
    Plan plan(UUID projectId, UUID ruleId) {
        List<PrecedenceRule> rules = precedence.find(projectId).map(PrecedenceRepository.Stored::rules)
                .orElse(List.of());
        int index = indexOf(rules, ruleId);
        PrecedenceRule rule = rules.get(index);
        if (rule.defaults() == null || rule.defaults().sprint() != PrecedenceSprint.JOIN) {
            throw new OfficiumException("precedence_rule_not_join",
                    "Only a rule that joins the active sprint can be backfilled: set its sprint to join and save",
                    422);
        }
        Sprint active = sprints.findActive(projectId).orElseThrow(() -> OfficiumException.conflict(
                "precedence_no_active_sprint", "The project has no active sprint to backfill into"));
        List<Card> all = cards.findAllByProject(projectId);
        List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(rules, all);
        List<Card> moving = all.stream()
                .filter(c -> !c.deleted() && c.category() != Category.EPIC)
                .filter(c -> !c.status().finished() && !c.status().closed())
                .filter(c -> !active.id().equals(c.sprintId()))
                .filter(c -> PrecedenceRules.rankOf(c, resolved) == index + 1)
                .sorted(Comparator.comparingInt(Card::number))
                .toList();
        Map<UUID, String> names = sprints.listByProject(projectId).stream()
                .collect(toMap(Sprint::id, Sprint::name, (a, b) -> a));
        return new Plan(rule, active, moving, names);
    }

    /** Moves the planned cards into the active sprint, with their history, events and search entries. */
    Applied apply(UUID projectId, UUID ruleId, Actor actor) {
        Plan plan = plan(projectId, ruleId);
        if (plan.cards().isEmpty()) {
            return new Applied(plan.rule(), plan.active(), List.of());
        }
        Instant now = Instant.now(clock);
        List<UUID> ids = plan.cards().stream().map(Card::id).toList();
        cards.reassignSprint(projectId, ids, plan.active().id(), now, actor);
        reindex.accept(projectId, ids);
        String joined = CardPrecedence.joinedText(plan.active(), plan.rule());
        for (Card card : plan.cards()) {
            activity.record(projectId, card.id(), card.key(), actor, "card.precedence", joined, now);
            activity.publish("card.updated", projectId, card.id(), card.key(), card.version() + 1, actor, now);
        }
        activity.record(projectId, null, null, actor, "project.precedence.backfill",
                "Rule \"" + plan.rule().name() + "\" (" + ruleId + ") brought " + plan.cards().size()
                        + " open cards into " + plan.active().name(),
                now);
        return new Applied(plan.rule(), plan.active(), plan.cards().stream().map(Card::key).toList());
    }

    private static int indexOf(List<PrecedenceRule> rules, UUID ruleId) {
        for (int i = 0; i < rules.size(); i++) {
            if (rules.get(i).id().equals(ruleId)) {
                return i;
            }
        }
        throw OfficiumException.notFound("precedence_rule_not_found", "The project has no precedence rule " + ruleId);
    }
}
