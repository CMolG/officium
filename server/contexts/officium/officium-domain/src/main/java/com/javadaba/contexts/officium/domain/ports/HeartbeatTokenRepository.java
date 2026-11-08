package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.HeartbeatToken;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** The heartbeat tokens of each account, one per device (JAVA-186, JAVA-675), by their hash. */
public interface HeartbeatTokenRepository {

    /** The account's devices, the one used most recently first. */
    List<HeartbeatToken> list(UUID accountId);

    /** Adds a device; never replaces another. */
    void save(HeartbeatToken token);

    /** Removes one device of that account; false when it has none with that id. */
    boolean delete(UUID accountId, UUID id);

    /**
     * The account the token belongs to, stamping its last use as {@code usedAt} when the stamp it has
     * is older than {@code staleBefore} (or missing): a beat every few seconds writes once a minute.
     */
    Optional<UUID> accountForTokenHash(String tokenHash, Instant usedAt, Instant staleBefore);
}
