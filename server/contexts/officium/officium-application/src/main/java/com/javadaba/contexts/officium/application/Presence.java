package com.javadaba.contexts.officium.application;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/** One open agent window's in-memory state. Guarded by its own monitor ({@link SessionQueueService}). */
final class Presence {

    final String id;
    final Instant registeredAt;
    String machine;
    String label;
    Instant lastSeenAt;
    CompletableFuture<Boolean> waiter;
    Current current;
    int cardsWorked;
    WindowTelemetry telemetry;
    Instant blockedSince;
    String blockedReason;

    Presence(String id, Instant now) {
        this.id = id;
        this.registeredAt = now;
        this.lastSeenAt = now;
    }

    record Current(UUID cardId, String cardKey, UUID projectId, Instant deliveredAt) {
    }
}
