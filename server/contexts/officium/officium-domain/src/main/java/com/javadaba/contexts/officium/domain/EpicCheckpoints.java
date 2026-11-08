package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.PriorityQueue;
import java.util.Set;
import java.util.UUID;

/**
 * An epic's checkpoints (card://JAVA-1876, epic JAVA-1868): its cards ({@link EpicChildren}), in the order one session
 * works them. A card blocked by a sibling comes after it; cards no sibling orders keep the board's order (planned in a
 * sprint first, then rank, then number); the epic's test card ({@link #TEST_TAG}) runs last, because it proves the rest.
 * A rejected card and a nested epic are not checkpoints.
 *
 * <p>A checkpoint is {@code pending} in Refine or To do ({@code planned} only out of Refine), {@code in_progress} In
 * progress, and {@code completed} from Ready on: implemented, waiting for the epic's review or past it. It is
 * {@code ready} when every card blocking it has finished or is a completed sibling, since a sweep reviews its siblings
 * together at its end.
 */
public final class EpicCheckpoints {

    /** The tag of an epic's test card (fast-tests.md, "Inside an epic"). */
    public static final String TEST_TAG = "epic-test";

    private EpicCheckpoints() {
    }

    public enum State {
        PENDING("pending"), IN_PROGRESS("in_progress"), COMPLETED("completed");

        private final String wire;

        State(String wire) {
            this.wire = wire;
        }

        public String wire() {
            return wire;
        }

        static State of(Status status) {
            return switch (status) {
                case REFINE, TODO -> PENDING;
                case DOING -> IN_PROGRESS;
                default -> COMPLETED;
            };
        }
    }

    /** {@code verification}: the epic's test card. {@code ready}: nothing outside the sweep holds it back. */
    public record Checkpoint(Card card, State state, boolean planned, boolean blocked, boolean ready,
            boolean verification) {

        /**
         * What a sweep's implementer works: an {@code ai} card that is no spike, planned, not yet completed, and ready.
         * A spike is research the plan rests on, worked in its own session; a human card is a person's.
         */
        public boolean sweepable() {
            return card.executor() == Executor.AI && card.category() != Category.SPIKE && planned
                    && state != State.COMPLETED && ready;
        }
    }

    public record Progress(int completed, int total) {
    }

    /** The checkpoints of the epic keyed {@code epicKey}, from the whole project and its blocks edges. */
    public static List<Checkpoint> of(String epicKey, List<Card> project, List<CardLink> blocksEdges) {
        List<Card> live = project.stream().filter(card -> !card.deleted()).toList();
        return of(EpicChildren.byEpic(live).getOrDefault(epicKey, List.of()), live, blocksEdges);
    }

    /** The checkpoints among {@code children}, the cards of one epic; {@code project} resolves their blockers. */
    public static List<Checkpoint> of(List<Card> children, List<Card> project, List<CardLink> blocksEdges) {
        List<Card> kept = children.stream()
                .filter(card -> card.status() != Status.REJECTED && card.category() != Category.EPIC).toList();
        Map<UUID, Card> byId = new HashMap<>();
        project.forEach(card -> byId.put(card.id(), card));
        Set<UUID> siblings = new HashSet<>();
        kept.forEach(card -> siblings.add(card.id()));
        Map<UUID, List<UUID>> blockersOf = new HashMap<>();
        for (CardLink edge : blocksEdges) {
            if (edge.type() == LinkType.BLOCKS && siblings.contains(edge.targetCardId())) {
                blockersOf.computeIfAbsent(edge.targetCardId(), id -> new ArrayList<>()).add(edge.sourceCardId());
            }
        }
        List<Checkpoint> ordered = new ArrayList<>();
        for (Card card : ordered(kept, siblings, blockersOf)) {
            List<Card> blockers = blockersOf.getOrDefault(card.id(), List.of()).stream()
                    .map(byId::get).filter(blocker -> blocker != null && !blocker.deleted()).toList();
            boolean blocked = blockers.stream().anyMatch(blocker -> !blocker.status().finished());
            boolean ready = blockers.stream().allMatch(blocker -> blocker.status().finished()
                    || (siblings.contains(blocker.id()) && State.of(blocker.status()) == State.COMPLETED));
            ordered.add(new Checkpoint(card, State.of(card.status()), card.status() != Status.REFINE, blocked, ready,
                    card.tags().contains(TEST_TAG)));
        }
        return List.copyOf(ordered);
    }

    public static Progress progress(List<Checkpoint> checkpoints) {
        int completed = (int) checkpoints.stream().filter(c -> c.state() == State.COMPLETED).count();
        return new Progress(completed, checkpoints.size());
    }

    /**
     * Every epic's progress, keyed by its key, from the whole project (card://JAVA-1873): what a list shows on an epic's
     * face. The order is not needed to count, so no blocks edge is read.
     */
    public static Map<String, Progress> progressByEpic(List<Card> project) {
        List<Card> live = project.stream().filter(card -> !card.deleted()).toList();
        Map<String, Progress> byEpic = new HashMap<>();
        EpicChildren.byEpic(live).forEach((key, children) -> byEpic.put(key, progress(of(children, live, List.of()))));
        return byEpic;
    }

    /** The checkpoint a sweep works now: the one in progress, else the first sweepable one; empty when none is left. */
    public static Optional<Checkpoint> next(List<Checkpoint> checkpoints) {
        return checkpoints.stream().filter(Checkpoint::sweepable)
                .min(Comparator.comparing((Checkpoint c) -> c.state() != State.IN_PROGRESS));
    }

    /**
     * Kahn's order over the sibling edges (blocks has no cycles, the board refuses them), each step taking the
     * board-order first card free of unplaced blockers; the test card always last.
     */
    private static List<Card> ordered(List<Card> kept, Set<UUID> siblings, Map<UUID, List<UUID>> blockersOf) {
        Comparator<Card> boardOrder = Comparator.comparing((Card card) -> card.tags().contains(TEST_TAG))
                .thenComparing(card -> card.sprintId() == null)
                .thenComparingInt(Card::rank).thenComparingInt(Card::number);
        Map<UUID, Integer> waiting = new HashMap<>();
        Map<UUID, List<Card>> unblocks = new HashMap<>();
        for (Card card : kept) {
            List<UUID> inside = blockersOf.getOrDefault(card.id(), List.of()).stream().filter(siblings::contains)
                    .distinct().toList();
            waiting.put(card.id(), inside.size());
            inside.forEach(blocker -> unblocks.computeIfAbsent(blocker, id -> new ArrayList<>()).add(card));
        }
        PriorityQueue<Card> free = new PriorityQueue<>(boardOrder);
        kept.stream().filter(card -> waiting.get(card.id()) == 0).forEach(free::add);
        List<Card> out = new ArrayList<>();
        while (!free.isEmpty()) {
            Card next = free.poll();
            out.add(next);
            for (Card freed : unblocks.getOrDefault(next.id(), List.of())) {
                if (waiting.merge(freed.id(), -1, Integer::sum) == 0) {
                    free.add(freed);
                }
            }
        }
        // A cycle cannot be stored, but a card it would strand still gets a place rather than vanishing.
        kept.stream().filter(card -> !out.contains(card)).sorted(boardOrder).forEach(out::add);
        return out;
    }
}
