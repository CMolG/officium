package com.javadaba.contexts.officium.application;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Wire shape of one live "an agent is actively working on this card" session (contract §4.1).
 *  {@code statuses} are newest first. {@code model} and {@code effort} are what the agent runs on, as
 *  its harness's heartbeat last said (JAVA-584); null until one says it. */
public record AgentWorkView(
        UUID cardId,
        String cardKey,
        ActorJson actor,
        Instant startedAt,
        Instant updatedAt,
        Instant expiresAt,
        List<StatusLine> statuses,
        String model,
        String effort) {

    public record StatusLine(String text, Instant at) {
    }
}
