package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/** card://JAVA-1047: the split by category, phase and model adds up to the period; a cardless session is overhead. */
class ValueBreakdownTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 3);
    private static final Instant TEN = Instant.parse("2026-10-03T10:00:00Z");
    private static final ModelPrices PRICES = new ModelPrices(List.of(
            new ModelPrice("claude-opus-5-5", LocalDate.of(2026, 1, 1), 4, 5, 8, 0.2, 20, "test", DAY)));
    private static final UUID CARD = UUID.randomUUID();
    private static final UUID NOT_DELIVERED_CARD = UUID.randomUUID();
    private static final TokenUsage ONE_MILLION_EACH_WAY = new TokenUsage(1_000_000, 0, 0, 1_000_000);

    private static Instant at(int hour) {
        return TEN.plus(Duration.ofHours(hour - 10));
    }

    private static CardTimeEntry session(UUID card, int startHour, int endHour) {
        return new CardTimeEntry(UUID.randomUUID(), card, DAY, endHour - startHour, "agent", null, null, TEN,
                TimeSource.AGENT_SESSION, TimeConcept.WORK, "claude-opus-5-5", "high", ONE_MILLION_EACH_WAY,
                at(startHour), at(endHour), "ref", null).withAttended(true);
    }

    @Test
    void theSplitsAddUpToTheRowsAndACardlessSessionIsOverhead() {
        List<ValueAttribution.Delivered> delivered = List.of(new ValueAttribution.Delivered(CARD, Category.BUG, 0));
        SessionOverhead overhead = new SessionOverhead(UUID.randomUUID(), UUID.randomUUID(), null, "ref", null,
                "claude-opus-5-5", "high", at(9), at(10), ONE_MILLION_EACH_WAY, false);

        ValueBreakdown.Breakdown breakdown = ValueBreakdown.of(delivered, List.of(session(CARD, 10, 12)),
                List.of(overhead), PRICES);

        assertThat(breakdown.byCategory()).extracting(ValueBreakdown.Line::key).containsExactly("bug", "overhead");
        assertThat(breakdown.byCategory().get(0).hours()).isCloseTo(2.0, within(1e-9));
        assertThat(breakdown.byCategory().get(1).apiValue()).isCloseTo(24.0, within(1e-9));
        assertThat(breakdown.byPhase()).extracting(ValueBreakdown.Line::key).containsExactly("overhead", "work");
        assertThat(breakdown.byModel()).hasSize(1);
        assertThat(breakdown.byModel().get(0).hours()).isCloseTo(3.0, within(1e-9));
        assertThat(breakdown.byModel().get(0).apiValue()).isCloseTo(48.0, within(1e-9));
    }

    @Test
    void aDeliveredCardWithNoCategoryIsItsOwnLineNotAFailure() {
        List<ValueAttribution.Delivered> delivered = List.of(new ValueAttribution.Delivered(CARD, null, 0));

        ValueBreakdown.Breakdown breakdown = ValueBreakdown.of(delivered, List.of(session(CARD, 10, 11)), List.of(),
                PRICES);

        assertThat(breakdown.byCategory()).extracting(ValueBreakdown.Line::key)
                .containsExactly(ValueBreakdown.NO_CATEGORY);
    }

    @Test
    void aCardNotDeliveredInThePeriodIsNamedSo() {
        ValueBreakdown.Breakdown breakdown = ValueBreakdown.of(List.of(), List.of(session(NOT_DELIVERED_CARD, 10, 11)),
                List.of(), PRICES);

        assertThat(breakdown.byCategory()).extracting(ValueBreakdown.Line::key)
                .containsExactly(ValueBreakdown.NOT_DELIVERED);
    }
}
