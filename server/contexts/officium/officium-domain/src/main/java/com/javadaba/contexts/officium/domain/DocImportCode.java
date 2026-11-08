package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * A one-time code for a bulk documentation import (JAVA-778, contract §8.13). The MCP mints it for
 * the account its OAuth token proves; the import script writes with it and reads its pages back to
 * check them, then closes it. It reaches one project's documentation and nothing else, for minutes,
 * so the content of hundreds of pages never has to pass through an agent. Only its hash is kept, as
 * with the heartbeat token.
 *
 * @param closedAt when the import was closed; null while it can still be used
 */
public record DocImportCode(UUID id, UUID projectId, UUID accountId, String codeHash, Instant expiresAt,
        Instant closedAt, Instant createdAt) {

    /** Tells an import code apart from every other Officium secret in a command or a log. */
    public static final String PREFIX = "ofdi_";

    public DocImportCode {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(projectId, "projectId");
        Objects.requireNonNull(accountId, "accountId");
        Objects.requireNonNull(codeHash, "codeHash");
        Objects.requireNonNull(expiresAt, "expiresAt");
        Objects.requireNonNull(createdAt, "createdAt");
    }

    public boolean usableAt(Instant now) {
        return closedAt == null && now.isBefore(expiresAt);
    }
}
