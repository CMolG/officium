package com.javadaba.contexts.officium.domain;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.TreeSet;

/**
 * How a span of imputed time becomes entries (JAVA-245, contract §8.4): one per UTC day and per
 * concept, so a day's total never carries another day's work and refinement is never counted as
 * work. Pure: the services hand it the span and when the card sat in {@link Status#REFINE}.
 */
public final class TimeSplit {

    private TimeSplit() {
    }

    /** {@code [start, end)}; a null {@code start} reaches back before the card existed, a null
     *  {@code end} is still open. */
    public record Interval(Instant start, Instant end) {

        boolean contains(Instant at) {
            return (start == null || !at.isBefore(start)) && (end == null || at.isBefore(end));
        }
    }

    public record Piece(LocalDate date, TimeConcept concept, Instant start, Instant end) {

        public double hours() {
            return Duration.between(start, end).toMillis() / 3_600_000.0;
        }
    }

    /**
     * When the card sat in refine, read from its moves. The activity log records where a move went,
     * not where it came from, so the status before the first move is inferred: a card whose first
     * move is to To do was being refined (that is the step out of refine), any other first move
     * leaves from a working column, and a card that never moved has always been where it is. Time an
     * agent spent before the card existed went into writing it, so a card born in refine was being
     * refined since before its creation.
     */
    public static List<Interval> refineIntervals(List<DeliveryFlow.Move> moves, Status current) {
        List<DeliveryFlow.Move> sorted = moves.stream().sorted(Comparator.comparing(DeliveryFlow.Move::at)).toList();
        Status status = sorted.isEmpty() ? current : sorted.get(0).to() == Status.TODO ? Status.REFINE : Status.TODO;
        Instant since = null;
        List<Interval> result = new ArrayList<>();
        for (DeliveryFlow.Move move : sorted) {
            if (status == Status.REFINE && move.to() != Status.REFINE) {
                result.add(new Interval(since, move.at()));
            } else if (status != Status.REFINE && move.to() == Status.REFINE) {
                since = move.at();
            }
            status = move.to();
        }
        if (status == Status.REFINE) {
            result.add(new Interval(since, null));
        }
        return result;
    }

    /** {@code [start, end)} cut at every UTC midnight and every refine boundary inside it. A span with
     *  no length is one piece of zero hours: its tokens still need an entry to live on. */
    public static List<Piece> pieces(Instant start, Instant end, List<Interval> refine) {
        return pieces(start, end, refine, null);
    }

    /** As above, but a non-null {@code fixed} concept (a test span, JAVA-983) takes every piece and only UTC
     *  midnights cut. */
    public static List<Piece> pieces(Instant start, Instant end, List<Interval> refine, TimeConcept fixed) {
        List<Interval> boundaries = fixed == null ? refine : List.of();
        if (!end.isAfter(start)) {
            return List.of(new Piece(dateOf(start), fixed != null ? fixed : conceptAt(start, refine), start, start));
        }
        TreeSet<Instant> cuts = new TreeSet<>(List.of(start, end));
        for (LocalDate day = dateOf(start).plusDays(1); day.atStartOfDay(ZoneOffset.UTC).toInstant()
                .isBefore(end); day = day.plusDays(1)) {
            cuts.add(day.atStartOfDay(ZoneOffset.UTC).toInstant());
        }
        for (Interval interval : boundaries) {
            for (Instant edge : new Instant[]{interval.start(), interval.end()}) {
                if (edge != null && edge.isAfter(start) && edge.isBefore(end)) {
                    cuts.add(edge);
                }
            }
        }
        List<Piece> result = new ArrayList<>();
        Instant from = null;
        for (Instant cut : cuts) {
            if (from != null) {
                Piece piece = new Piece(dateOf(from), fixed != null ? fixed : conceptAt(from, refine), from, cut);
                Piece last = result.isEmpty() ? null : result.get(result.size() - 1);
                if (last != null && last.date().equals(piece.date()) && last.concept() == piece.concept()) {
                    result.set(result.size() - 1, new Piece(last.date(), last.concept(), last.start(), cut));
                } else {
                    result.add(piece);
                }
            }
            from = cut;
        }
        return result;
    }

    /** {@code total} spread over the pieces by their length; the last one takes what rounding left, so
     *  the parts add up to the whole. */
    public static List<TokenUsage> apportion(TokenUsage total, List<Piece> pieces) {
        long whole = pieces.stream().mapToLong(p -> Duration.between(p.start(), p.end()).toMillis()).sum();
        List<TokenUsage> result = new ArrayList<>();
        TokenUsage given = TokenUsage.ZERO;
        for (int i = 0; i < pieces.size(); i++) {
            TokenUsage part;
            if (i == pieces.size() - 1) {
                part = total.minus(given);
            } else {
                Piece piece = pieces.get(i);
                part = whole == 0
                        ? TokenUsage.ZERO
                        : total.scaled(Duration.between(piece.start(), piece.end()).toMillis() / (double) whole);
            }
            given = given.plus(part);
            result.add(part);
        }
        return result;
    }

    private static TimeConcept conceptAt(Instant at, List<Interval> refine) {
        return refine.stream().anyMatch(i -> i.contains(at)) ? TimeConcept.REFINE : TimeConcept.WORK;
    }

    private static LocalDate dateOf(Instant at) {
        return at.atZone(ZoneOffset.UTC).toLocalDate();
    }
}
