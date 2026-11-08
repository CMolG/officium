package com.javadaba.apps.api.account;

import java.time.Instant;
import java.util.UUID;

/**
 * The caller of an Officium Local request. There is exactly one: the local owner. The {@code email}
 * slot carries the owner name, which is what the activity log shows as the person.
 */
public record AccountSession(UUID accountId, String email, Instant expiresAt, boolean admin, boolean emailVerified) {

    public AccountSession(UUID accountId, String email, Instant expiresAt) {
        this(accountId, email, expiresAt, false, false);
    }
}
