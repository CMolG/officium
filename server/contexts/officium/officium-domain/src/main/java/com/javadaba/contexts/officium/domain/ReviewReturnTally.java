package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * What a period sent back (card://JAVA-1416, contract §8.3): the send-backs whose time falls in the period,
 * by reason and by category, most first, and how many cards that passed review in the period did so the first
 * time. Pure, like {@link RejectionTally}: the service hands it the project's cards, send-backs and moves.
 */
public record ReviewReturnTally(int total, List<ByReason> byReason, List<ByCategory> byCategory,
        FirstTimePass firstTimePass) {

    /** A return naming several reasons counts once for each. */
    public record ByReason(ReviewReturnReason reason, int count) {
    }

    /** {@code category} is null for the cards with none. */
    public record ByCategory(Category category, int count) {
    }

    /**
     * {@code passed}: cards that went through review and whose first arrival at deploy or done falls in the period; {@code firstTime}: those
     * never sent back before it. {@code share} is null when nothing passed.
     */
    public record FirstTimePass(int passed, int firstTime, Double share) {
    }

    /**
     * @param start the period's first instant, included
     * @param end   the period's end, excluded
     */
    public static ReviewReturnTally of(Map<UUID, Card> cards, List<ReviewReturn> returns,
            List<DeliveryFlow.Move> moves, Instant start, Instant end) {
        List<ReviewReturn> inPeriod = returns.stream()
                .filter(r -> !r.at().isBefore(start) && r.at().isBefore(end))
                .filter(r -> cards.containsKey(r.cardId()))
                .toList();
        Map<ReviewReturnReason, Integer> reasons = new LinkedHashMap<>();
        Map<Optional<Category>, Integer> categories = new LinkedHashMap<>();
        for (ReviewReturn entry : inPeriod) {
            entry.reasons().forEach(reason -> reasons.merge(reason, 1, Integer::sum));
            categories.merge(Optional.ofNullable(cards.get(entry.cardId()).category()), 1, Integer::sum);
        }
        return new ReviewReturnTally(inPeriod.size(),
                reasons.entrySet().stream().map(e -> new ByReason(e.getKey(), e.getValue()))
                        .sorted(Comparator.comparingInt(ByReason::count).reversed().thenComparing(ByReason::reason))
                        .toList(),
                categories.entrySet().stream().map(e -> new ByCategory(e.getKey().orElse(null), e.getValue()))
                        .sorted(Comparator.comparingInt(ByCategory::count).reversed()
                                .thenComparing(ByCategory::category, Comparator.nullsLast(Comparator.naturalOrder())))
                        .toList(),
                firstTimePass(cards, returns, moves, start, end));
    }

    private static FirstTimePass firstTimePass(Map<UUID, Card> cards, List<ReviewReturn> returns,
            List<DeliveryFlow.Move> moves, Instant start, Instant end) {
        Map<UUID, Instant> firstPass = new HashMap<>();
        Set<UUID> reviewed = new HashSet<>();
        moves.stream().sorted(Comparator.comparing(DeliveryFlow.Move::at)).forEach(m -> {
            if (m.to() == Status.REVIEW) {
                reviewed.add(m.cardId());
            } else if (m.to().finished() && reviewed.contains(m.cardId())) {
                firstPass.putIfAbsent(m.cardId(), m.at());
            }
        });
        int passed = 0;
        int firstTime = 0;
        for (Map.Entry<UUID, Instant> pass : firstPass.entrySet()) {
            Instant at = pass.getValue();
            if (!cards.containsKey(pass.getKey()) || at.isBefore(start) || !at.isBefore(end)) {
                continue;
            }
            passed++;
            boolean sentBack = returns.stream()
                    .anyMatch(r -> r.cardId().equals(pass.getKey()) && r.at().isBefore(at));
            if (!sentBack) {
                firstTime++;
            }
        }
        return new FirstTimePass(passed, firstTime,
                passed == 0 ? null : Math.round(firstTime * 1000.0 / passed) / 1000.0);
    }
}
