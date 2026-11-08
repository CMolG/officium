package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

/** card://JAVA-1047: a usage is priced by the version in force on its day, and an unpriced model is never guessed. */
class ModelPricesTest {

    private static final ModelPrice OLD = new ModelPrice("model-a", LocalDate.of(2026, 1, 1),
            3.0, 3.75, 6.0, 0.3, 15.0, "published", LocalDate.of(2026, 10, 1));
    private static final ModelPrice NEW = new ModelPrice("model-a", LocalDate.of(2026, 6, 1),
            5.0, 6.25, 10.0, 0.5, 25.0, "published", LocalDate.of(2026, 10, 1));
    private static final ModelPrices TABLE = new ModelPrices(List.of(OLD, NEW));

    @Test
    void aUsageIsPricedByTheVersionInForceThatDay() {
        assertThat(TABLE.priceAt("model-a", LocalDate.of(2026, 5, 31))).contains(OLD);
        assertThat(TABLE.priceAt("model-a", LocalDate.of(2026, 6, 1))).contains(NEW);
        assertThat(TABLE.priceAt("model-a", LocalDate.of(2027, 1, 1))).contains(NEW);
    }

    @Test
    void aModelWithNoRowIsUnpricedNotGuessed() {
        assertThat(TABLE.priceAt("model-b", LocalDate.of(2026, 10, 1))).isEmpty();
        assertThat(TABLE.apiCost("model-b", new TokenUsage(1, 0, 0, 1), LocalDate.of(2026, 10, 1))).isEmpty();
    }

    @Test
    void theCostCountsInputCacheReadsAndOutputAtTheirOwnRates() {
        // 1M fresh input at 5, 2M cache reads at 0.5, 1M output at 25 = 5 + 1 + 25
        TokenUsage usage = new TokenUsage(1_000_000, 2_000_000, 0, 1_000_000);
        assertThat(NEW.costOf(usage)).isEqualTo(31.0);
        assertThat(TABLE.apiCost("model-a", usage, LocalDate.of(2026, 10, 1)).getAsDouble()).isEqualTo(31.0);
    }

    @Test
    void aPriceCannotBeNegativeOrAnonymous() {
        assertThatThrownBy(() -> new ModelPrice("", LocalDate.of(2026, 1, 1), 1, 1, 1, 1, 1, "s", null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ModelPrice("m", LocalDate.of(2026, 1, 1), -1, 1, 1, 1, 1, "s", null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    /** card://JAVA-1777: Sonnet 5.5 at list price, cache writes in both buckets, by hand: 0.7M x 2 + 0.1M x 2.50 + 0.2M x 4 + 2M x 0.10 + 0.3M x 10. */
    @Test
    void aUsageWithCacheWritesIsPricedBucketByBucket() {
        ModelPrice sonnet = new ModelPrice("claude-sonnet-5-5", LocalDate.of(2026, 1, 1), 2, 2.5, 4, 0.1, 10, "s",
                null);
        TokenUsage usage = new TokenUsage(1_000_000, 2_000_000, 0, 300_000, 100_000, 200_000);

        assertThat(sonnet.costOf(usage)).isCloseTo(5.65, within(1e-9));
    }

    /** The measured session of JAVA-1777's plan: the stored shape reads 1.016179, the list price 1.432227. */
    @Test
    void theMeasuredSessionIsPricedAtTheListPriceNotAsInput() {
        ModelPrice sonnet = new ModelPrice("claude-sonnet-5-5", LocalDate.of(2026, 1, 1), 2, 2.5, 4, 0.1, 10, "s",
                null);
        TokenUsage measured = new TokenUsage(208_072, 3_713_349, 0, 22_870, 0, 208_024);

        assertThat(sonnet.costOf(measured)).isCloseTo(1.432227, within(1e-6));
        assertThat(sonnet.costOf(new TokenUsage(208_072, 3_713_349, 0, 22_870))).isCloseTo(1.016179, within(1e-6));
    }

    /** A split can hand a part more writes than its input: fresh input is clamped at zero, never a negative cost. */
    @Test
    void writesAboveTheirInputNeverMakeAFreshCostNegative() {
        ModelPrice sonnet = new ModelPrice("claude-sonnet-5-5", LocalDate.of(2026, 1, 1), 2, 2.5, 4, 0.1, 10, "s",
                null);

        assertThat(sonnet.costOf(new TokenUsage(5, 0, 0, 0, 0, 6))).isCloseTo(24e-6, within(1e-12));
    }
}
