package com.javadaba.contexts.officium.domain;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * How the value report gives each delivered card its hours and its share of the month's consumption
 * (card://JAVA-1047). A card with no measured run gets the mean measured hours of its category, else
 * the month's mean, else none; it is flagged as imputed so the report can say how many. The month's
 * consumption is then spread over the cards by hours, so every row adds up to the total.
 */
public final class ValueAttribution {

    /** A card delivered in the month; {@code measuredHours} is zero when no run or session measured it. */
    public record Delivered(UUID cardId, Category category, double measuredHours) {
    }

    /** The hours a card is counted with, and whether they were imputed rather than measured. */
    public record Hours(UUID cardId, double hours, boolean imputed) {
    }

    private ValueAttribution() {
    }

    public static List<Hours> impute(List<Delivered> delivered) {
        List<Delivered> measured = delivered.stream().filter(d -> d.measuredHours() > 0).toList();
        Map<Category, Double> categoryMean = measured.stream()
                .filter(d -> d.category() != null)
                .collect(Collectors.groupingBy(Delivered::category,
                        Collectors.averagingDouble(Delivered::measuredHours)));
        double overallMean = measured.stream().mapToDouble(Delivered::measuredHours).average().orElse(0);
        return delivered.stream()
                .map(d -> d.measuredHours() > 0
                        ? new Hours(d.cardId(), d.measuredHours(), false)
                        : imputed(d, categoryMean, overallMean))
                .toList();
    }

    /** Each card's share of {@code total} by its hours; cards with no hours get no share. */
    public static Map<UUID, Double> spread(double total, List<Hours> hours) {
        double sum = sumOf(hours);
        Map<UUID, Double> shares = new LinkedHashMap<>();
        if (sum == 0) {
            return shares;
        }
        measuredOnly(hours).forEach(h -> shares.put(h.cardId(), total * h.hours() / sum));
        return shares;
    }

    /**
     * The same split for tokens. Whole counts cannot be divided exactly, so the last measured card
     * takes what the others left: the parts always add up to {@code total}.
     */
    public static Map<UUID, TokenUsage> spreadTokens(TokenUsage total, List<Hours> hours) {
        double sum = sumOf(hours);
        Map<UUID, TokenUsage> shares = new LinkedHashMap<>();
        if (sum == 0) {
            return shares;
        }
        List<Hours> counted = measuredOnly(hours);
        TokenUsage left = total;
        for (int i = 0; i < counted.size(); i++) {
            Hours h = counted.get(i);
            TokenUsage share = i == counted.size() - 1 ? left : total.scaled(h.hours() / sum);
            shares.put(h.cardId(), share);
            left = left.minus(share);
        }
        return shares;
    }

    private static Hours imputed(Delivered d, Map<Category, Double> categoryMean, double overallMean) {
        double mean = d.category() == null ? overallMean : categoryMean.getOrDefault(d.category(), overallMean);
        return new Hours(d.cardId(), mean, mean > 0);
    }

    private static List<Hours> measuredOnly(List<Hours> hours) {
        return hours.stream().filter(h -> h.hours() > 0).toList();
    }

    private static double sumOf(List<Hours> hours) {
        return hours.stream().mapToDouble(Hours::hours).sum();
    }
}
