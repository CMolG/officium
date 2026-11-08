package com.javadaba.contexts.officium.domain.ports;

import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** The monthly price of an account's AI subscription (card://JAVA-1047): one per account, none by default. */
public interface AccountSubscriptionRepository {

    Optional<Double> monthlyUsdOf(UUID accountId);

    /** The accounts that have a price; an account without one is absent from the map. */
    Map<UUID, Double> monthlyUsdOf(Collection<UUID> accountIds);

    void save(UUID accountId, double monthlyUsd, Instant updatedAt);
}
