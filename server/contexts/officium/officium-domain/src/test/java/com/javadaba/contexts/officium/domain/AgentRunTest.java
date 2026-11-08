package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AgentRunTest {

    private static final Actor AGENT = Actor.agent(UUID.randomUUID(), "Claude Code");
    private static final Instant T0 = Instant.parse("2026-09-24T10:00:00Z");

    @Test
    void underAMinuteImputesNothing() {
        assertThat(AgentRun.worthImputing(T0, T0.plusSeconds(60))).isTrue();
        assertThat(AgentRun.worthImputing(T0, T0.plusSeconds(59))).isFalse();
        assertThat(AgentRun.worthImputing(T0, T0)).isFalse();
        assertThat(AgentRun.worthImputing(T0, T0.minusSeconds(600))).isFalse();
    }

    @Test
    void aLiveRunEndsNowButALapsedOneEndsAtItsLastSignOfLife() {
        Instant lastSeen = T0.plus(Duration.ofMinutes(30));
        AgentRun run = new AgentRun(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), AGENT, T0, lastSeen,
                null);

        Instant stillAlive = lastSeen.plus(Duration.ofMinutes(9));
        assertThat(run.lapsedAt(stillAlive)).isFalse();
        assertThat(run.endFor(stillAlive)).isEqualTo(stillAlive);

        Instant gone = lastSeen.plus(AgentRun.LAPSE);
        assertThat(run.lapsedAt(gone)).isTrue();
        assertThat(run.endFor(gone.plus(Duration.ofHours(5)))).isEqualTo(lastSeen);
    }
}
