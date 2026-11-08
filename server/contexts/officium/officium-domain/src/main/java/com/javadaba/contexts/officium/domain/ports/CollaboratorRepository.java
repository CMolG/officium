package com.javadaba.contexts.officium.domain.ports;

import java.util.Set;
import java.util.UUID;

/**
 * The accounts with access to any project the owner owns, direct membership or a team grant, the
 * owner excluded and archived projects included (JAVA-1009). Every code path that gives someone
 * access must ask the quota first: a new entry point that skips it lets the cap be passed.
 */
public interface CollaboratorRepository {

    Set<UUID> collaboratorsOf(UUID ownerAccountId);
}
