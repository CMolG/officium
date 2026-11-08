package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * What a period rejected (card://JAVA-1415, contract §8.3): the cards rejected now whose last move
 * into rejected falls in the period, by reason and by category, most first. Pure, like
 * {@link DeliveryFlow}: the service hands it the cards and when each last entered its status.
 */
public record RejectionTally(int total, List<ByReason> byReason, List<ByCategory> byCategory) {

    public record ByReason(RejectionReason reason, int count) {
    }

    /** {@code category} is null for the cards with none. */
    public record ByCategory(Category category, int count) {
    }

    /**
     * @param lastArrivals when each card last entered the status it is in now ({@link DeliveryFlow#lastArrivals});
     *                     a card with no recorded move counts from its creation
     * @param start        the period's first instant, included
     * @param end          the period's end, excluded
     */
    public static RejectionTally of(Collection<Card> cards, Map<UUID, Instant> lastArrivals, Instant start,
            Instant end) {
        List<Card> rejected = cards.stream()
                .filter(c -> c.status() == Status.REJECTED && c.rejection() != null)
                .filter(c -> {
                    Instant at = lastArrivals.getOrDefault(c.id(), c.createdAt());
                    return !at.isBefore(start) && at.isBefore(end);
                })
                .toList();
        Map<RejectionReason, Integer> reasons = new LinkedHashMap<>();
        Map<Optional<Category>, Integer> categories = new LinkedHashMap<>();
        for (Card card : rejected) {
            reasons.merge(card.rejection().reason(), 1, Integer::sum);
            categories.merge(Optional.ofNullable(card.category()), 1, Integer::sum);
        }
        return new RejectionTally(rejected.size(),
                reasons.entrySet().stream().map(e -> new ByReason(e.getKey(), e.getValue()))
                        .sorted(Comparator.comparingInt(ByReason::count).reversed()
                                .thenComparing(ByReason::reason))
                        .toList(),
                categories.entrySet().stream().map(e -> new ByCategory(e.getKey().orElse(null), e.getValue()))
                        .sorted(Comparator.comparingInt(ByCategory::count).reversed()
                                .thenComparing(ByCategory::category, Comparator.nullsLast(Comparator.naturalOrder())))
                        .toList());
    }
}
