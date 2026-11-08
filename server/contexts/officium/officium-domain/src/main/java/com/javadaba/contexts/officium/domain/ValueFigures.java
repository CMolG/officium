package com.javadaba.contexts.officium.domain;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.TreeSet;
import java.util.UUID;

/**
 * The figures of one period of the value report (card://JAVA-1047), from the period's card time, its overhead
 * and its delivered cards. Pure: the service reads the rows, this says what they add up to.
 *
 * <p>Agent rows are the card's imputed time (run or session) and the overhead. A row with a span counts its span,
 * one without counts its hours. Unattended hours are the spans no attended window overlaps, and only rows the
 * harness classified (attended known) take part: {@code classifiedHours} says how much that is.
 *
 * <p>The fee is the sum of the monthly prices of the accounts that reported; the ratios need it, so they are null
 * when it is absent (an account has no price, or nothing reported).
 */
public final class ValueFigures {

    /** One row of agent work: a card's time entry or an overhead track. {@code span} is null when it has none. */
    record Row(UUID cardId, TimeConcept concept, LocalDate date, UnattendedHours.Span span, double hours,
            Boolean attended, TokenUsage tokens, String model) {
    }

    /** The period's figures. Null ratios mean the fee is not known for every reporting account. */
    public record Figures(int delivered, int imputed, double agentHours, double classifiedHours, double unattendedHours,
            long tokens, double apiValue, int unpricedRows, List<String> unpricedModels, Double costPerDeliveredCard,
            Double valuePerDollar) {
    }

    private ValueFigures() {
    }

    public static Figures of(List<ValueAttribution.Delivered> delivered, List<CardTimeEntry> entries,
            List<SessionOverhead> overhead, ModelPrices prices, OptionalDouble monthlyFee) {
        Map<UUID, Double> measured = measuredByCard(entries);
        List<ValueAttribution.Delivered> withMeasure = delivered.stream()
                .map(d -> new ValueAttribution.Delivered(d.cardId(), d.category(),
                        measured.getOrDefault(d.cardId(), 0.0)))
                .toList();
        int imputed = (int) ValueAttribution.impute(withMeasure).stream().filter(ValueAttribution.Hours::imputed)
                .count();

        List<Row> rows = rowsOf(entries, overhead);
        List<UnattendedHours.Span> attendedSpans = rows.stream()
                .filter(r -> Boolean.TRUE.equals(r.attended()) && r.span() != null)
                .map(Row::span)
                .toList();
        double agent = 0;
        double classified = 0;
        double unattended = 0;
        for (Row row : rows) {
            agent += agentHours(row);
            if (row.span() == null || row.attended() == null) {
                continue;
            }
            classified += hours(row.span().length());
            unattended += hours(UnattendedHours.of(row.span(), attendedSpans));
        }

        Pricing pricing = price(rows, prices);
        Double perCard = monthlyFee.isPresent() && !delivered.isEmpty()
                ? monthlyFee.getAsDouble() / delivered.size()
                : null;
        Double perDollar = monthlyFee.isPresent() && monthlyFee.getAsDouble() > 0
                ? pricing.value() / monthlyFee.getAsDouble()
                : null;
        return new Figures(delivered.size(), imputed, agent, classified, unattended, tokensOf(rows), pricing.value(),
                pricing.unpricedRows(), pricing.unpricedModels(), perCard, perDollar);
    }

    /** The measured hours of each card: the time an agent measured on it, never a person's typed time. */
    private static Map<UUID, Double> measuredByCard(Collection<CardTimeEntry> entries) {
        Map<UUID, Double> measured = new HashMap<>();
        for (CardTimeEntry entry : entries) {
            if (entry.source() != TimeSource.MANUAL && entry.cardId() != null) {
                measured.merge(entry.cardId(), entry.hours(), Double::sum);
            }
        }
        return measured;
    }

    /** The agent rows of a period: every card's measured time (manual entries are a person's, not agent work) and
     *  every cardless session. */
    static List<Row> rowsOf(List<CardTimeEntry> entries, List<SessionOverhead> overhead) {
        List<Row> rows = new ArrayList<>();
        entries.stream().filter(e -> e.source() != TimeSource.MANUAL).map(ValueFigures::rowOf).forEach(rows::add);
        overhead.stream().map(ValueFigures::rowOf).forEach(rows::add);
        return rows;
    }

    private static Row rowOf(CardTimeEntry entry) {
        UnattendedHours.Span span = span(entry.startedAt(), entry.endedAt());
        return new Row(entry.cardId(), entry.concept(), entry.date(), span, entry.hours(), entry.attended(),
                entry.tokens(), entry.model());
    }

    private static Row rowOf(SessionOverhead row) {
        UnattendedHours.Span span = span(row.startedAt(), row.endedAt());
        LocalDate date = row.startedAt() == null ? null : row.startedAt().atZone(ZoneOffset.UTC).toLocalDate();
        return new Row(null, null, date, span, span == null ? 0 : hours(span.length()), row.attended(), row.tokens(),
                row.model());
    }

    private static UnattendedHours.Span span(Instant start, Instant end) {
        return start == null || end == null || end.isBefore(start) ? null : new UnattendedHours.Span(start, end);
    }

    private record Pricing(double value, int unpricedRows, List<String> unpricedModels) {
    }

    /** API-equivalent value of every row that spent tokens; a row whose model has no price on its day is counted,
     *  never guessed. */
    private static Pricing price(List<Row> rows, ModelPrices prices) {
        double value = 0;
        int unpriced = 0;
        TreeSet<String> models = new TreeSet<>();
        for (Row row : rows) {
            if (row.tokens() == null || row.tokens().isZero()) {
                continue;
            }
            OptionalDouble cost = row.date() == null
                    ? OptionalDouble.empty()
                    : prices.apiCost(row.model(), row.tokens(), row.date());
            if (cost.isPresent()) {
                value += cost.getAsDouble();
            } else {
                unpriced++;
                models.add(row.model() == null ? "(no model)" : row.model());
            }
        }
        return new Pricing(value, unpriced, List.copyOf(models));
    }

    /** Every token the rows spent, cache reads included; reasoning is part of the output already. */
    private static long tokensOf(List<Row> rows) {
        return rows.stream()
                .filter(r -> r.tokens() != null)
                .mapToLong(r -> r.tokens().tokensIn() + r.tokens().cachedTokensIn() + r.tokens().tokensOut())
                .sum();
    }

    /** A row's agent hours: its span when it has one, else the hours it reported. */
    static double agentHours(Row row) {
        return row.span() == null ? row.hours() : hours(row.span().length());
    }

    private static double hours(Duration length) {
        return length.toMillis() / 3_600_000d;
    }
}
