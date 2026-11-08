package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * A one-time code a machine trades for its own heartbeat token (JAVA-675, contract §4.2), the way
 * fluxor-sync enrolls (JAVA-555): the MCP mints it for the account its OAuth token proves, the setup
 * command redeems it, and the token goes from the response straight to a file, never through the
 * conversation. Only its hash is kept.
 *
 * @param consumedAt when it was redeemed; null while it can still be
 * @param signInFamily the native app's sign-in that asked for it, handed to the token it is redeemed
 *                     into (JAVA-1425); null from a web session or the MCP
 */
public record HeartbeatCode(UUID id, UUID accountId, String codeHash, Instant expiresAt, Instant consumedAt,
        Instant createdAt, UUID signInFamily) {

    /** Tells a code apart from a token in a command or a log. */
    public static final String PREFIX = "ofhc_";

    public HeartbeatCode {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(accountId, "accountId");
        Objects.requireNonNull(codeHash, "codeHash");
        Objects.requireNonNull(expiresAt, "expiresAt");
        Objects.requireNonNull(createdAt, "createdAt");
    }

    public HeartbeatCode(UUID id, UUID accountId, String codeHash, Instant expiresAt, Instant consumedAt,
            Instant createdAt) {
        this(id, accountId, codeHash, expiresAt, consumedAt, createdAt, null);
    }

    public boolean redeemableAt(Instant now) {
        return consumedAt == null && now.isBefore(expiresAt);
    }
}
