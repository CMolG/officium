package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/** card://JAVA-1777: a period's recorded usage, at API list prices, with what could not be priced named. */
class UsageCostTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 21);
    private static final Instant NOW = Instant.parse("2026-10-21T10:00:00Z");
    private static final ModelPrices PRICES = new ModelPrices(List.of(
            new ModelPrice("claude-sonnet-5-5", LocalDate.of(2026, 1, 1), 2, 2.5, 4, 0.1, 10, "test", DAY)));

    @Test
    void aSessionIsPricedBucketByBucketAtItsModelsRates() {
        TokenUsage spent = new TokenUsage(1_000_000, 2_000_000, 0, 300_000, 100_000, 200_000);

        UsageCost cost = UsageCost.of(List.of(session("claude-sonnet-5-5", spent)), PRICES);

        assertThat(cost.usd()).isCloseTo(5.65, within(1e-9));
        assertThat(cost.usdOrNull()).isCloseTo(5.65, within(1e-9));
        assertThat(cost.pricedRows()).isEqualTo(1);
        assertThat(cost.unpricedRows()).isZero();
    }

    @Test
    void aModelWithNoPriceIsCountedAndNamedNeverValued() {
        TokenUsage spent = new TokenUsage(1_000, 0, 0, 1_000);

        UsageCost cost = UsageCost.of(List.of(session("claude-unknown", spent)), PRICES);

        assertThat(cost.usdOrNull()).isNull();
        assertThat(cost.unpricedRows()).isEqualTo(1);
        assertThat(cost.unpricedModels()).containsExactly("claude-unknown");
    }

    @Test
    void anEntryWithNoTokensIsNotAUsageRow() {
        UsageCost cost = UsageCost.of(List.of(manual()), PRICES);

        assertThat(cost.usdOrNull()).isNull();
        assertThat(cost.pricedRows()).isZero();
        assertThat(cost.unpricedRows()).isZero();
    }

    private static CardTimeEntry session(String model, TokenUsage tokens) {
        return new CardTimeEntry(UUID.randomUUID(), UUID.randomUUID(), DAY, 1, "Claude Code", null, null, NOW,
                TimeSource.AGENT_SESSION, TimeConcept.WORK, model, "medium", tokens, null, null, null, null);
    }

    private static CardTimeEntry manual() {
        return new CardTimeEntry(UUID.randomUUID(), UUID.randomUUID(), DAY, 1, "Carlos", null, null, NOW,
                TimeSource.MANUAL);
    }
}
