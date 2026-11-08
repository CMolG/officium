package com.javadaba.contexts.officium.domain;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The unit a card is worked in, in a project whose {@link ExecutionMode} is {@code epic} (card://JAVA-1874, epic
 * JAVA-1868). A card of an open epic is never worked alone in the action and review phases: its epic is, with every
 * checkpoint of that phase, in one session. Everything else is its own unit, as in {@code card} mode: an epic's spike
 * (research the plan rests on), a human card, and the Refine, Ready and Deploy phases.
 *
 * <p>An epic is in {@code action} while a checkpoint is in progress or a sweep can work one, and in {@code review} once
 * none is left and a checkpoint waits in Review, so the epic's work is reviewed together at the end of its sweep.
 */
public record EpicUnit(Card epic, Phase phase, List<EpicCheckpoints.Checkpoint> checkpoints) {

    /** The unit {@code card} belongs to, or empty when it is worked as itself; {@code project} is the whole project. */
    public static Optional<EpicUnit> of(Card card, List<Card> project, List<CardLink> blocksEdges) {
        Optional<Phase> phase = Phase.of(card.status());
        if (card.category() == Category.EPIC || card.category() == Category.SPIKE || card.executor() == Executor.HUMAN
                || phase.isEmpty() || (phase.get() != Phase.ACTION && phase.get() != Phase.REVIEW)) {
            return Optional.empty();
        }
        List<Card> live = project.stream().filter(c -> !c.deleted()).toList();
        for (Map.Entry<String, List<Card>> entry : EpicChildren.byEpic(live).entrySet()) {
            if (entry.getValue().stream().anyMatch(child -> child.id().equals(card.id()))) {
                return live.stream().filter(c -> c.key().equals(entry.getKey()) && !c.status().closed()).findFirst()
                        .flatMap(epic -> of(epic, EpicCheckpoints.of(entry.getValue(), live, blocksEdges)));
            }
        }
        return Optional.empty();
    }

    /** The epic as a unit in its current phase, read from its checkpoints; empty when it has nothing to sweep or review. */
    public static Optional<EpicUnit> of(Card epic, List<EpicCheckpoints.Checkpoint> checkpoints) {
        boolean action = checkpoints.stream()
                .anyMatch(c -> c.sweepable() || (c.state() == EpicCheckpoints.State.IN_PROGRESS
                        && c.card().executor() == Executor.AI && c.card().category() != Category.SPIKE));
        if (action) {
            return Optional.of(new EpicUnit(epic, Phase.ACTION, checkpoints));
        }
        boolean review = checkpoints.stream().anyMatch(c -> c.card().status() == Status.REVIEW
                && c.card().executor() == Executor.AI && c.card().category() != Category.SPIKE);
        return review ? Optional.of(new EpicUnit(epic, Phase.REVIEW, checkpoints)) : Optional.empty();
    }

    /** The epic's unit, from the whole project; empty when it is closed or has nothing to sweep or review. */
    public static Optional<EpicUnit> ofEpic(Card epic, List<Card> project, List<CardLink> blocksEdges) {
        if (epic.category() != Category.EPIC || epic.status().closed()) {
            return Optional.empty();
        }
        return of(epic, EpicCheckpoints.of(epic.key(), project, blocksEdges));
    }
}
