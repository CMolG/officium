package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.OptionalDouble;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/** card://JAVA-1047: the period's figures add up from its rows; a ratio needs the fee, an unpriced model is counted. */
class ValueFiguresTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 3);
    private static final Instant TEN = Instant.parse("2026-10-03T10:00:00Z");
    private static final ModelPrices PRICES = new ModelPrices(List.of(
            new ModelPrice("claude-opus-5-5", LocalDate.of(2026, 1, 1), 4, 5, 8, 0.2, 20, "test", DAY)));
    private static final UUID CARD = UUID.randomUUID();
    private static final UUID OTHER = UUID.randomUUID();
    private static final TokenUsage ONE_MILLION_EACH_WAY = new TokenUsage(1_000_000, 0, 0, 1_000_000);

    private static Instant at(int hour, int minute) {
        return TEN.plus(Duration.ofHours(hour - 10)).plus(Duration.ofMinutes(minute));
    }

    private static CardTimeEntry session(UUID card, Instant start, Instant end, Boolean attended, TokenUsage tokens,
            String model) {
        double hours = Duration.between(start, end).toMinutes() / 60.0;
        return new CardTimeEntry(UUID.randomUUID(), card, DAY, hours, "agent", null, null, TEN,
                TimeSource.AGENT_SESSION, TimeConcept.WORK, model, "high", tokens, start, end, "ref", null)
                .withAttended(attended);
    }

    private static final List<ValueAttribution.Delivered> DELIVERED_TWO = List.of(
            new ValueAttribution.Delivered(CARD, Category.BUG, 0),
            new ValueAttribution.Delivered(OTHER, Category.BUG, 0));

    @Test
    void theValueIsTheAPIPriceOfEveryRowThatSpentTokens() {
        List<CardTimeEntry> entries = List.of(session(CARD, at(10, 0), at(11, 0), true, ONE_MILLION_EACH_WAY,
                "claude-opus-5-5"));
        ValueFigures.Figures figures = ValueFigures.of(DELIVERED_TWO, entries, List.of(), PRICES,
                OptionalDouble.empty());
        assertThat(figures.apiValue()).isCloseTo(24.0, within(1e-9));
        assertThat(figures.tokens()).isEqualTo(2_000_000);
    }

    @Test
    void theRatiosNeedTheFeeAndAreNullWithoutIt() {
        List<CardTimeEntry> entries = List.of(session(CARD, at(10, 0), at(11, 0), true, ONE_MILLION_EACH_WAY,
                "claude-opus-5-5"));
        ValueFigures.Figures without = ValueFigures.of(DELIVERED_TWO, entries, List.of(), PRICES,
                OptionalDouble.empty());
        assertThat(without.costPerDeliveredCard()).isNull();
        assertThat(without.valuePerDollar()).isNull();

        ValueFigures.Figures with = ValueFigures.of(DELIVERED_TWO, entries, List.of(), PRICES, OptionalDouble.of(100));
        assertThat(with.costPerDeliveredCard()).isCloseTo(50.0, within(1e-9));
        assertThat(with.valuePerDollar()).isCloseTo(0.24, within(1e-9));
    }

    @Test
    void anUnpricedModelIsCountedAndNamedNeverValued() {
        List<CardTimeEntry> entries = List.of(session(CARD, at(10, 0), at(11, 0), true, ONE_MILLION_EACH_WAY,
                "claude-mystery-1"));
        ValueFigures.Figures figures = ValueFigures.of(DELIVERED_TWO, entries, List.of(), PRICES,
                OptionalDouble.empty());
        assertThat(figures.apiValue()).isZero();
        assertThat(figures.unpricedRows()).isEqualTo(1);
        assertThat(figures.unpricedModels()).containsExactly("claude-mystery-1");
    }

    @Test
    void theUnattendedHoursAreTheAgentSpansNoAttendedWindowOverlaps() {
        List<CardTimeEntry> entries = List.of(
                session(CARD, at(10, 0), at(12, 0), false, null, null),
                session(CARD, at(10, 30), at(11, 0), true, null, null));
        ValueFigures.Figures figures = ValueFigures.of(DELIVERED_TWO, entries, List.of(), PRICES,
                OptionalDouble.empty());
        assertThat(figures.unattendedHours()).isCloseTo(1.5, within(1e-6));
        assertThat(figures.classifiedHours()).isCloseTo(2.5, within(1e-6));
        assertThat(figures.agentHours()).isCloseTo(2.5, within(1e-6));
    }

    @Test
    void aRowTheHarnessNeverClassifiedIsLeftOutOfTheUnattendedHours() {
        List<CardTimeEntry> entries = List.of(session(CARD, at(10, 0), at(12, 0), null, null, null));
        ValueFigures.Figures figures = ValueFigures.of(DELIVERED_TWO, entries, List.of(), PRICES,
                OptionalDouble.empty());
        assertThat(figures.agentHours()).isCloseTo(2.0, within(1e-6));
        assertThat(figures.classifiedHours()).isZero();
        assertThat(figures.unattendedHours()).isZero();
    }

    @Test
    void aDeliveredCardWithNoMeasuredTimeIsImputedAndCounted() {
        List<CardTimeEntry> entries = List.of(session(CARD, at(10, 0), at(12, 0), true, null, null));
        ValueFigures.Figures figures = ValueFigures.of(DELIVERED_TWO, entries, List.of(), PRICES,
                OptionalDouble.empty());
        assertThat(figures.delivered()).isEqualTo(2);
        assertThat(figures.imputed()).isEqualTo(1);
    }

    @Test
    void overheadCountsAsAgentWorkOfThePeriodWithoutACard() {
        SessionOverhead overhead = new SessionOverhead(UUID.randomUUID(), UUID.randomUUID(), null, "ref", null,
                "claude-opus-5-5", "high", at(9, 0), at(10, 0), ONE_MILLION_EACH_WAY, false);
        ValueFigures.Figures figures = ValueFigures.of(DELIVERED_TWO, List.of(), List.of(overhead), PRICES,
                OptionalDouble.empty());
        assertThat(figures.apiValue()).isCloseTo(24.0, within(1e-9));
        assertThat(figures.unattendedHours()).isCloseTo(1.0, within(1e-6));
    }
}
