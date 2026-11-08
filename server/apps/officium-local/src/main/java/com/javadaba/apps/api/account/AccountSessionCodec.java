package com.javadaba.apps.api.account;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

/**
 * Local stand-in for the Cloud session codec. Every request resolves to the one fixed local owner,
 * whatever cookie it carries (or none); the optional bearer token is enforced earlier, by
 * {@code LocalGateFilter}. The resources keep calling {@code verify(cookie)} unchanged.
 */
@ApplicationScoped
public class AccountSessionCodec {

    private final UUID accountId;
    private final String ownerName;

    public AccountSessionCodec(
            @ConfigProperty(name = "officium.local.account-id", defaultValue = "00000000-0000-4000-8000-000000000001") String accountId,
            @ConfigProperty(name = "officium.local.owner-name", defaultValue = "Local owner") String ownerName) {
        this.accountId = UUID.fromString(accountId);
        this.ownerName = ownerName;
    }

    public Optional<AccountSession> verify(String ignoredCookie) {
        return Optional.of(owner());
    }

    public AccountSession owner() {
        return new AccountSession(accountId, ownerName, Instant.now().plus(1, ChronoUnit.HOURS), false, false);
    }

    public UUID ownerId() {
        return accountId;
    }
}
