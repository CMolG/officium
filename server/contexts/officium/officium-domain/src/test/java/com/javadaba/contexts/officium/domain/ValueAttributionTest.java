package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/** card://JAVA-1047: imputed cards are flagged, and the month's consumption splits without losing a token. */
class ValueAttributionTest {

    private static final UUID A = UUID.randomUUID();
    private static final UUID B = UUID.randomUUID();
    private static final UUID C = UUID.randomUUID();
    private static final UUID D = UUID.randomUUID();

    @Test
    void aCardWithNoMeasuredRunTakesItsCategoryMean() {
        List<ValueAttribution.Hours> hours = ValueAttribution.impute(List.of(
                new ValueAttribution.Delivered(A, Category.BUG, 2),
                new ValueAttribution.Delivered(B, Category.BUG, 4),
                new ValueAttribution.Delivered(C, Category.FEATURE, 10),
                new ValueAttribution.Delivered(D, Category.BUG, 0)));
        assertThat(hours).contains(new ValueAttribution.Hours(D, 3, true));
        assertThat(hours).contains(new ValueAttribution.Hours(A, 2, false));
    }

    @Test
    void aCardWithNoCategoryOrNoCategoryMeanTakesTheMonthsMean() {
        List<ValueAttribution.Hours> hours = ValueAttribution.impute(List.of(
                new ValueAttribution.Delivered(A, Category.BUG, 2),
                new ValueAttribution.Delivered(B, Category.FEATURE, 10),
                new ValueAttribution.Delivered(C, null, 0),
                new ValueAttribution.Delivered(D, Category.SPIKE, 0)));
        assertThat(hours).contains(new ValueAttribution.Hours(C, 6, true));
        assertThat(hours).contains(new ValueAttribution.Hours(D, 6, true));
    }

    @Test
    void aCardNobodyMeasuredInAMonthWithNothingMeasuredStaysUnmeasured() {
        List<ValueAttribution.Hours> hours = ValueAttribution.impute(List.of(
                new ValueAttribution.Delivered(A, Category.BUG, 0)));
        assertThat(hours).containsExactly(new ValueAttribution.Hours(A, 0, false));
        assertThat(ValueAttribution.spread(100, hours)).isEmpty();
    }

    @Test
    void theCostSpreadsByHoursAndAddsUpToTheTotal() {
        List<ValueAttribution.Hours> hours = List.of(
                new ValueAttribution.Hours(A, 1, false),
                new ValueAttribution.Hours(B, 3, true),
                new ValueAttribution.Hours(C, 0, false));
        Map<UUID, Double> shares = ValueAttribution.spread(100, hours);
        assertThat(shares).doesNotContainKey(C);
        assertThat(shares.get(A)).isCloseTo(25, within(1e-9));
        assertThat(shares.values().stream().mapToDouble(Double::doubleValue).sum()).isCloseTo(100, within(1e-9));
    }

    @Test
    void theTokensSpreadWithNoTokenLost() {
        TokenUsage total = new TokenUsage(10, 7, 3, 11);
        List<ValueAttribution.Hours> hours = List.of(
                new ValueAttribution.Hours(A, 1, false),
                new ValueAttribution.Hours(B, 1, false),
                new ValueAttribution.Hours(C, 1, false));
        Map<UUID, TokenUsage> shares = ValueAttribution.spreadTokens(total, hours);
        TokenUsage sum = shares.values().stream().reduce(TokenUsage.ZERO, TokenUsage::plus);
        assertThat(sum).isEqualTo(total);
    }
}
