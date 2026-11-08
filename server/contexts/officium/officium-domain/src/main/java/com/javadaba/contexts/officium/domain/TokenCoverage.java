package com.javadaba.contexts.officium.domain;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * How much of a period's work has recorded tokens (card://JAVA-1588). A delivery is covered when its card
 * carries tokens from some session, all time: the per-card figure averages over the covered deliveries
 * only, so a delivery nobody reported a session for no longer halves it. Manual hours never carry tokens,
 * so they are left out of the hours share.
 */
public final class TokenCoverage {

    /** Below this share of deliveries or of agent hours the figures say what they cover (decided at refine). */
    public static final double WARN_BELOW = 0.8;

    private TokenCoverage() {
    }

    /** {@code deliveredShare} and {@code hoursShare} are null over zero. */
    public record View(int deliveries, int covered, Double deliveredShare, double agentHours,
            double agentHoursWithTokens, Double hoursShare, double warnBelow) {
    }

    /** {@code perDelivery} is the average over the covered deliveries, null when none is covered. */
    public record Result(View view, TokenUsage perDelivery) {
    }

    /**
     * @param delivered       one card id per delivery in the period
     * @param recordedByCard  every card's tokens, all time; a card with no session is absent
     * @param periodEntries   the period's time entries, manual ones included (they are not counted)
     */
    public static Result of(List<UUID> delivered, Map<UUID, TokenUsage> recordedByCard,
            List<CardTimeEntry> periodEntries) {
        List<TokenUsage> covered = delivered.stream().map(recordedByCard::get).filter(Objects::nonNull)
                .toList();
        TokenUsage sum = covered.stream().reduce(TokenUsage.ZERO, TokenUsage::plus);
        TokenUsage perDelivery = covered.isEmpty() ? null : sum.scaled(1.0 / covered.size());

        List<CardTimeEntry> agent = periodEntries.stream().filter(e -> e.source() != TimeSource.MANUAL).toList();
        double agentHours = agent.stream().mapToDouble(CardTimeEntry::hours).sum();
        double withTokens = agent.stream().filter(e -> e.tokens() != null).mapToDouble(CardTimeEntry::hours).sum();

        View view = new View(delivered.size(), covered.size(), share(covered.size(), delivered.size()), agentHours,
                withTokens, share(withTokens, agentHours), WARN_BELOW);
        return new Result(view, perDelivery);
    }

    private static Double share(double part, double whole) {
        return whole == 0 ? null : part / whole;
    }
}
