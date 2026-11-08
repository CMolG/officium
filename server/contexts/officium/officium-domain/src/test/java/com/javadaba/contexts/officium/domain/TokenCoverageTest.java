package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class TokenCoverageTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 10);
    private static final Instant NOW = Instant.parse("2026-10-10T12:00:00Z");
    private static final TokenUsage TOKENS_A = new TokenUsage(1000, 0, 0, 200);
    private static final TokenUsage TOKENS_B = new TokenUsage(3000, 0, 0, 400);

    private static final UUID A = UUID.randomUUID();
    private static final UUID B = UUID.randomUUID();
    private static final UUID C = UUID.randomUUID();
    private static final UUID D = UUID.randomUUID();

    @Test
    void sharesCountOnlyWhatRecordedTokens() {
        List<CardTimeEntry> period = List.of(
                session(A, 4, TOKENS_A),
                session(C, 3, null),
                session(D, 3, null),
                manual(A, 2));

        TokenCoverage.Result result = TokenCoverage.of(List.of(A, B, C, D),
                Map.of(A, TOKENS_A, B, TOKENS_B), period);

        assertThat(result.view().deliveries()).isEqualTo(4);
        assertThat(result.view().covered()).isEqualTo(2);
        assertThat(result.view().deliveredShare()).isCloseTo(0.5, within(1e-9));
        assertThat(result.view().agentHours()).isCloseTo(10, within(1e-9));
        assertThat(result.view().agentHoursWithTokens()).isCloseTo(4, within(1e-9));
        assertThat(result.view().hoursShare()).isCloseTo(0.4, within(1e-9));
        assertThat(result.view().warnBelow()).isEqualTo(TokenCoverage.WARN_BELOW);
    }

    @Test
    void perDeliveryAveragesOverTheCardsThatRecordedTokens() {
        List<CardTimeEntry> period = List.of(session(A, 4, TOKENS_A));

        TokenCoverage.Result result = TokenCoverage.of(List.of(A, B, C, D),
                Map.of(A, TOKENS_A, B, TOKENS_B), period);

        assertThat(result.perDelivery().tokensIn()).isEqualTo(2000);
        assertThat(result.perDelivery().tokensOut()).isEqualTo(300);
    }

    @Test
    void noCoveredDeliveryHasNoPerDeliveryFigure() {
        TokenCoverage.Result result = TokenCoverage.of(List.of(A), Map.of(), List.of());

        assertThat(result.view().covered()).isZero();
        assertThat(result.view().deliveredShare()).isZero();
        assertThat(result.view().hoursShare()).isNull();
        assertThat(result.perDelivery()).isNull();
    }

    @Test
    void noDeliveriesHasNoShare() {
        TokenCoverage.Result result = TokenCoverage.of(List.of(), Map.of(A, TOKENS_A), List.of());

        assertThat(result.view().deliveredShare()).isNull();
        assertThat(result.perDelivery()).isNull();
    }

    private static CardTimeEntry manual(UUID card, double hours) {
        return new CardTimeEntry(UUID.randomUUID(), card, DAY, hours, "Carlos", null, null, NOW, TimeSource.MANUAL);
    }

    private static CardTimeEntry session(UUID card, double hours, TokenUsage tokens) {
        return new CardTimeEntry(UUID.randomUUID(), card, DAY, hours, "Claude Code", null, null, NOW,
                TimeSource.AGENT_SESSION, TimeConcept.WORK, "claude-haiku-5-5", "medium", tokens, null, null, null,
                null);
    }
}
