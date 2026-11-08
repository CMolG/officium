package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.OrganizationName;

import java.util.Optional;
import java.util.UUID;

/** The name an owner gave their organization (JAVA-1780). A row exists only after a rename. */
public interface OrganizationNameRepository {

    Optional<OrganizationName> find(UUID ownerAccountId);

    void put(UUID ownerAccountId, OrganizationName name);
}
