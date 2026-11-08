package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Nickname;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Nicknames per organization (JAVA-199). An organization is, today, the account that owns the
 * projects (contract §8.5), so {@code organizationId} is that owner's account id.
 */
public interface NicknameRepository {

    Optional<Nickname> find(UUID organizationId, UUID accountId);

    Map<UUID, Nickname> listByOrganization(UUID organizationId);

    /** @return {@code false} when someone else in the organization already has it. */
    boolean put(UUID organizationId, UUID accountId, Nickname nickname);

    void delete(UUID organizationId, UUID accountId);
}
