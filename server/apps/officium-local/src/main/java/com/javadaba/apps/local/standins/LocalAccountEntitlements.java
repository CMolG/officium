package com.javadaba.apps.local.standins;

import com.javadaba.contexts.officium.domain.Entitlements;
import com.javadaba.contexts.officium.domain.ports.AccountEntitlements;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Set;
import java.util.UUID;

/** Officium Local has no plans: the one local owner holds every entitlement. */
@ApplicationScoped
public class LocalAccountEntitlements implements AccountEntitlements {

    @Override
    public Set<String> of(UUID accountId) {
        return Set.of(Entitlements.ROLE_MATRIX_EDIT, Entitlements.RUN_CONFIG_EDIT);
    }
}
