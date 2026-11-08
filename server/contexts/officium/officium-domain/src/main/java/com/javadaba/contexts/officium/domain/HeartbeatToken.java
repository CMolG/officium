package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * The secret one machine's harness beats with (JAVA-186, contract §4.2): a hook that runs as a plain
 * process cannot reach the MCP's OAuth token, so it sends this one instead. One per device since
 * JAVA-675, so setting a second machine up never silences the first; only its hash is kept, and the
 * plain token is shown once, to whoever created it or to the file the setup writes.
 *
 * <p>Its authority is the smallest that keeps a card alive: renewing, and adding a status line to, a
 * session that one of the account's agents ALREADY started through the MCP on the machine the beat
 * names. It never starts a session and never writes a card. Hashed like {@link ChangelogToken}, for
 * the same reason.
 *
 * @param machine    the device it was issued for, as the setup named it; null for a token created
 *                   before devices existed, or from the web without a name
 * @param lastUsedAt the last beat or signed call, to the minute; null when never used
 * @param signInFamily the native app's sign-in it was created from, directly or through a setup code,
 *                     which it ends with (JAVA-1425); null from a web session or the MCP
 */
public record HeartbeatToken(UUID id, UUID accountId, String tokenHash, String machine, Instant createdAt,
        Instant lastUsedAt, UUID signInFamily) {

    /** Tells the token apart in a secret store or a leaked log. */
    public static final String PREFIX = "ofhb_";

    public HeartbeatToken {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(accountId, "accountId");
        Objects.requireNonNull(tokenHash, "tokenHash");
        Objects.requireNonNull(createdAt, "createdAt");
    }

    public HeartbeatToken(UUID id, UUID accountId, String tokenHash, String machine, Instant createdAt,
            Instant lastUsedAt) {
        this(id, accountId, tokenHash, machine, createdAt, lastUsedAt, null);
    }

    public static String hash(String token) {
        return ChangelogToken.hash(token);
    }

    /** When it last proved itself alive: its last use, or its creation if it was never used. */
    public Instant lastSeen() {
        return lastUsedAt != null ? lastUsedAt : createdAt;
    }
}
