package com.javadaba.contexts.officium.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * How cards flowed through the board, read from their moves (JAVA-55, contract §8.3). Pure: the
 * service hands it the project's moves and asks what was delivered and how long it took.
 *
 * <p><strong>Delivered</strong> is the FIRST arrival at review or later: a card that bounces back
 * from review and returns is one delivery, not two, and the moment it counts is the first time the
 * work was handed over. <strong>Cycle time</strong> runs from its first move into In progress to
 * that delivery. A card delivered without ever passing through In progress has no cycle time,
 * rather than a made-up one.
 *
 * <p>Delivered also means kept: a move to {@link Status#REJECTED rejected} cancels the card's earlier
 * delivery and start (card://JAVA-1415), so a card that ends rejected was never delivered, and one
 * reopened and delivered again counts once, at the new delivery. A past period's count drops when one
 * of its cards is rejected later, by design.
 */
public final class DeliveryFlow {

    /** The summary {@code CardService#move} writes, which is where a move's destination is read back. */
    public static final String MOVED_TO = "Card moved to ";

    private DeliveryFlow() {
    }

    public record Move(UUID cardId, Status to, Instant at, Actor actor) {
    }

    public record Delivery(UUID cardId, Instant deliveredAt, Actor by, Double cycleHours) {
    }

    /** The move an activity entry records, when it records one. */
    public static Optional<Move> moveOf(ActivityEntry entry) {
        if (entry.cardId() == null || !"card.moved".equals(entry.operation()) || entry.summary() == null
                || !entry.summary().startsWith(MOVED_TO)) {
            return Optional.empty();
        }
        try {
            return Optional.of(new Move(entry.cardId(), Status.fromWire(entry.summary().substring(MOVED_TO.length())),
                    entry.at(), entry.actor()));
        } catch (IllegalArgumentException unknownStatus) {
            return Optional.empty();
        }
    }

    public static boolean delivers(Status status) {
        return status == Status.REVIEW || status.finished();
    }

    /** Each card's first delivery, oldest first. */
    public static List<Delivery> deliveries(List<Move> moves) {
        Map<UUID, Instant> firstDoing = new HashMap<>();
        Map<UUID, Delivery> delivered = new LinkedHashMap<>();
        for (Move move : chronological(moves)) {
            if (move.to() == Status.REJECTED) {
                delivered.remove(move.cardId());
                firstDoing.remove(move.cardId());
                continue;
            }
            if (delivered.containsKey(move.cardId())) {
                continue;
            }
            if (move.to() == Status.DOING) {
                firstDoing.putIfAbsent(move.cardId(), move.at());
            } else if (delivers(move.to())) {
                Instant started = firstDoing.get(move.cardId());
                Double cycle = started == null ? null : hoursBetween(started, move.at());
                delivered.put(move.cardId(), new Delivery(move.cardId(), move.at(), move.actor(), cycle));
            }
        }
        return new ArrayList<>(delivered.values());
    }

    /** When each card last entered the column it is in now, from its moves. */
    public static Map<UUID, Instant> lastArrivals(List<Move> moves) {
        Map<UUID, Instant> result = new HashMap<>();
        for (Move move : chronological(moves)) {
            result.put(move.cardId(), move.at());
        }
        return result;
    }

    public static double hoursBetween(Instant from, Instant to) {
        return Duration.between(from, to).toMillis() / 3_600_000.0;
    }

    private static List<Move> chronological(List<Move> moves) {
        return moves.stream().sorted(Comparator.comparing(Move::at)).toList();
    }
}
