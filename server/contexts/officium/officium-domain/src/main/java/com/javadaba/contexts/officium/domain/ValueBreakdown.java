package com.javadaba.contexts.officium.domain;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The period's agent hours and API-equivalent value, split by category, by phase and by model (card://JAVA-1047).
 *
 * <p>A card's rows take the category it was delivered with; a card not delivered in the period is
 * {@value #NOT_DELIVERED}. A cardless session is {@value #OVERHEAD} in every split, and its phase is the overhead's
 * too. A row whose model has no price is counted at zero here, as {@link ValueFigures} counts it as unpriced.
 */
public final class ValueBreakdown {

    static final String OVERHEAD = "overhead";
    static final String NOT_DELIVERED = "not delivered";
    static final String NO_MODEL = "(no model)";
    static final String NO_CATEGORY = "(no category)";

    /** One line of a split: the key, and the sums of its rows. */
    public record Line(String key, double hours, double apiValue) {
    }

    public record Breakdown(List<Line> byCategory, List<Line> byPhase, List<Line> byModel) {
    }

    /** A row with its hours and its API-equivalent value. */
    private record Priced(ValueFigures.Row row, double hours, double value) {
    }

    private ValueBreakdown() {
    }

    public static Breakdown of(List<ValueAttribution.Delivered> delivered, List<CardTimeEntry> entries,
            List<SessionOverhead> overhead, ModelPrices prices) {
        Map<UUID, String> categories = delivered.stream()
                .collect(Collectors.toMap(ValueAttribution.Delivered::cardId,
                        d -> d.category() == null ? NO_CATEGORY : d.category().wire(), (first, second) -> first));
        List<Priced> rows = ValueFigures.rowsOf(entries, overhead).stream()
                .map(row -> new Priced(row, ValueFigures.agentHours(row), valueOf(row, prices)))
                .toList();
        return new Breakdown(
                lines(rows, row -> categoryOf(row, categories)),
                lines(rows, row -> row.cardId() == null ? OVERHEAD : row.concept().wire()),
                lines(rows, row -> row.model() == null ? NO_MODEL : row.model()));
    }

    private static String categoryOf(ValueFigures.Row row, Map<UUID, String> categories) {
        if (row.cardId() == null) {
            return OVERHEAD;
        }
        String category = categories.get(row.cardId());
        return category == null ? NOT_DELIVERED : category;
    }

    /** The API price of a row's tokens on its day; zero when it spent none, or its model has no price. */
    private static double valueOf(ValueFigures.Row row, ModelPrices prices) {
        if (row.tokens() == null || row.tokens().isZero() || row.date() == null) {
            return 0;
        }
        return prices.apiCost(row.model(), row.tokens(), row.date()).orElse(0);
    }

    /** The rows grouped by their key, the keys in order. */
    private static List<Line> lines(List<Priced> rows, Function<ValueFigures.Row, String> key) {
        return rows.stream()
                .collect(Collectors.groupingBy(p -> key.apply(p.row()), TreeMap::new, Collectors.toList()))
                .entrySet().stream()
                .map(e -> new Line(e.getKey(), e.getValue().stream().mapToDouble(Priced::hours).sum(),
                        e.getValue().stream().mapToDouble(Priced::value).sum()))
                .toList();
    }
}
