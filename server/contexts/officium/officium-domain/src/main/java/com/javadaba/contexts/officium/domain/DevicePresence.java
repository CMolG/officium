package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.UUID;

/** What one device of an account last said about its Officium tab (JAVA-1144): the current state only. */
public record DevicePresence(UUID accountId, UUID deviceId, String label, boolean visible, boolean focused,
        Instant firstSeenAt, Instant lastSeenAt, Instant closedAt) {
}
