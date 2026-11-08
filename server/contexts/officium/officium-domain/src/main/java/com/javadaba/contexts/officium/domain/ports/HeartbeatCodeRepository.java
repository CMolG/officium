package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.HeartbeatCode;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** The one-time setup codes a machine trades for its heartbeat token (JAVA-675), by their hash. */
public interface HeartbeatCodeRepository {

    void save(HeartbeatCode code);

    Optional<HeartbeatCode> findByCodeHash(String codeHash);

    /** Spends the code, once: false when another redemption spent it first. */
    boolean consume(UUID id, Instant now);

    /** Codes of the account still redeemable at {@code now}. */
    int countLive(UUID accountId, Instant now);

    /** Drops every code that lapsed, spent or not: the table only ever holds live ones. */
    void deleteExpired(Instant now);
}
