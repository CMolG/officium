package com.javadaba.apps.local.standins;

import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.domain.ports.AccountDirectory;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** The directory of Officium Local holds one account: the local owner. */
@ApplicationScoped
public class LocalAccountDirectory implements AccountDirectory {

    private final AccountSessionCodec owner;

    public LocalAccountDirectory(AccountSessionCodec owner) {
        this.owner = owner;
    }

    @Override
    public Optional<Found> findByEmail(String email) {
        return Optional.empty();
    }

    @Override
    public List<Found> findAllByEmail(String email) {
        return List.of();
    }

    @Override
    public Optional<Found> findByAccountId(UUID accountId) {
        if (!owner.ownerId().equals(accountId)) {
            return Optional.empty();
        }
        var session = owner.owner();
        return Optional.of(new Found(session.accountId(), session.email(), session.email()));
    }
}
