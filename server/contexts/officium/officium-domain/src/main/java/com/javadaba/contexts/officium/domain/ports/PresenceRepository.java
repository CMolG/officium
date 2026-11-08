package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.DevicePresence;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** One row per (account, device) with the device's last report (JAVA-1144). */
public interface PresenceRepository {

    /** Records a beat, reopening the device if it had closed; keeps its first-seen time. */
    void beat(UUID accountId, UUID deviceId, String label, boolean visible, boolean focused, Instant at);

    /** Marks the device closed; a device the account never reported is left alone. */
    void close(UUID accountId, UUID deviceId, Instant at);

    List<DevicePresence> list(UUID accountId);

    /** Drops what was last seen before {@code unseenBefore}, then all but the {@code keep} seen most recently. */
    void prune(UUID accountId, Instant unseenBefore, int keep);
}
