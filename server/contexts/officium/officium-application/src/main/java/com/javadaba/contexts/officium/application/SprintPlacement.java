package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.OrderReindexer;
import com.javadaba.contexts.officium.domain.Sprint;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.SprintRepository;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * The one write that plans a card into a sprint or back into the backlog (JAVA-53): both groups stay
 * dense, the card's version is checked, and the history and the live boards say so. {@link CardService}
 * checks the request and answers the view; this class moves the card. Also what the epic rule and the
 * precedence join use (JAVA-290, JAVA-1686).
 */
final class SprintPlacement {

    private final CardRepository cards;
    private final SprintRepository sprints;
    private final ActivityPublisher activity;
    private final Clock clock;

    SprintPlacement(CardRepository cards, SprintRepository sprints, ActivityPublisher activity, Clock clock) {
        this.cards = cards;
        this.sprints = sprints;
        this.activity = activity;
        this.clock = clock;
    }

    /**
     * Puts {@code current} into {@code target} (null = the backlog) at {@code position} there, and records
     * {@code type}/{@code text} in its history. Empty when its version moved since it was read.
     */
    Optional<Card> plan(UUID projectId, Card current, UUID target, int position, Actor actor, String type,
            String text) {
        List<UUID> sourceWithoutMoving = cards.sprintOrder(projectId, current.sprintId()).stream()
                .filter(id -> !id.equals(current.id())).toList();
        Map<UUID, Integer> sourceRanks;
        Map<UUID, Integer> destRanks;
        if (Objects.equals(current.sprintId(), target)) {
            sourceRanks = Map.of();
            destRanks = OrderReindexer.reindexWithInsertion(sourceWithoutMoving, current.id(), position);
        } else {
            sourceRanks = OrderReindexer.reindex(sourceWithoutMoving);
            destRanks = OrderReindexer.reindexWithInsertion(cards.sprintOrder(projectId, target), current.id(),
                    position);
        }
        Instant now = Instant.now(clock);
        if (!cards.setSprintIfVersion(projectId, current.id(), current.version(), target, sourceRanks, destRanks, now,
                actor)) {
            return Optional.empty();
        }
        Optional<Card> planned = cards.findById(projectId, current.id());
        planned.ifPresent(card -> {
            activity.record(projectId, card.id(), card.key(), actor, type, text, now);
            activity.publish("card.updated", projectId, card.id(), card.key(), card.version(), actor, now);
        });
        return planned;
    }

    /** A card that became an epic leaves its sprint for the end of the backlog, and its history says why (JAVA-290). */
    Optional<Card> unplanEpic(UUID projectId, Card epic, Actor actor) {
        String from = sprintName(projectId, epic.sprintId());
        return plan(projectId, epic, null, cards.sprintOrder(projectId, null).size(), actor, "card.sprint",
                "Taken out of " + from + " to the backlog: an epic isn't planned, its children are");
    }

    /** The name a history line gives a sprint: the backlog for null, else the sprint's name. */
    String sprintName(UUID projectId, UUID sprintId) {
        if (sprintId == null) {
            return "the backlog";
        }
        return sprints.findById(projectId, sprintId).map(Sprint::name).orElse("a sprint");
    }
}
