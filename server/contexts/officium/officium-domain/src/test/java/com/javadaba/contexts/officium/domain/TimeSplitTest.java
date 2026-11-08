package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/** JAVA-245: imputed time is cut per UTC day and per concept, and its tokens follow the time. */
class TimeSplitTest {

    private static final UUID CARD = UUID.randomUUID();
    private static final Actor AGENT = Actor.agent(UUID.randomUUID(), "Claude Code");
    private static final Instant CREATED = Instant.parse("2026-09-28T08:00:00Z");

    @Test
    void aCardBornInRefineWasRefinedUntilItsFirstMoveToTodo() {
        var refine = TimeSplit.refineIntervals(List.of(move(Status.TODO, "2026-09-28T10:00:00Z"),
                move(Status.DOING, "2026-09-28T11:00:00Z")), Status.DOING);

        assertThat(refine).containsExactly(new TimeSplit.Interval(null, at("2026-09-28T10:00:00Z")));
    }

    @Test
    void aCardSentBackToRefineIsRefinedFromThenOn() {
        var refine = TimeSplit.refineIntervals(List.of(move(Status.DOING, "2026-09-28T10:00:00Z"),
                move(Status.REFINE, "2026-09-28T11:00:00Z")), Status.REFINE);

        assertThat(refine).containsExactly(new TimeSplit.Interval(at("2026-09-28T11:00:00Z"), null));
    }

    @Test
    void aCardThatNeverMovedIsWhereItIs() {
        assertThat(TimeSplit.refineIntervals(List.of(), Status.REFINE))
                .containsExactly(new TimeSplit.Interval(null, null));
        assertThat(TimeSplit.refineIntervals(List.of(), Status.TODO)).isEmpty();
    }

    @Test
    void aSpanIsCutAtTheMoveOutOfRefineAndAtMidnight() {
        var refine = List.of(new TimeSplit.Interval(CREATED, at("2026-09-28T23:00:00Z")));

        var pieces = TimeSplit.pieces(at("2026-09-28T22:00:00Z"), at("2026-09-29T01:30:00Z"), refine);

        assertThat(pieces).extracting(TimeSplit.Piece::date, TimeSplit.Piece::concept).containsExactly(
                org.assertj.core.groups.Tuple.tuple(LocalDate.of(2026, 9, 28), TimeConcept.REFINE),
                org.assertj.core.groups.Tuple.tuple(LocalDate.of(2026, 9, 28), TimeConcept.WORK),
                org.assertj.core.groups.Tuple.tuple(LocalDate.of(2026, 9, 29), TimeConcept.WORK));
        assertThat(pieces).extracting(TimeSplit.Piece::hours).containsExactly(1.0, 1.0, 1.5);
    }

    @Test
    void aTestSpanIsCutOnlyAtMidnightWhateverRefineSays() {
        var refine = List.of(new TimeSplit.Interval(CREATED, at("2026-09-28T23:00:00Z")));

        var pieces = TimeSplit.pieces(at("2026-09-28T22:00:00Z"), at("2026-09-29T01:30:00Z"), refine,
                TimeConcept.TEST);

        assertThat(pieces).extracting(TimeSplit.Piece::date, TimeSplit.Piece::concept).containsExactly(
                org.assertj.core.groups.Tuple.tuple(LocalDate.of(2026, 9, 28), TimeConcept.TEST),
                org.assertj.core.groups.Tuple.tuple(LocalDate.of(2026, 9, 29), TimeConcept.TEST));
        assertThat(pieces).extracting(TimeSplit.Piece::hours).containsExactly(2.0, 1.5);
    }

    @Test
    void aSpanWithNoLengthIsOnePieceOfZeroHours() {
        var pieces = TimeSplit.pieces(at("2026-09-28T12:00:00Z"), at("2026-09-28T12:00:00Z"), List.of());

        assertThat(pieces).hasSize(1);
        assertThat(pieces.get(0).hours()).isCloseTo(0, within(1e-9));
        assertThat(pieces.get(0).concept()).isEqualTo(TimeConcept.WORK);
    }

    @Test
    void tokensFollowTheTimeAndAddUpToTheWhole() {
        var pieces = TimeSplit.pieces(at("2026-09-28T23:00:00Z"), at("2026-09-29T02:00:00Z"), List.of());
        TokenUsage total = new TokenUsage(1000, 90_001, 7, 3001);

        var parts = TimeSplit.apportion(total, pieces);

        assertThat(parts.get(0)).isEqualTo(new TokenUsage(333, 30_000, 2, 1000));
        assertThat(parts.get(0).plus(parts.get(1))).isEqualTo(total);
    }

    private static DeliveryFlow.Move move(Status to, String when) {
        return new DeliveryFlow.Move(CARD, to, at(when), AGENT);
    }

    private static Instant at(String iso) {
        return Instant.parse(iso);
    }
}
