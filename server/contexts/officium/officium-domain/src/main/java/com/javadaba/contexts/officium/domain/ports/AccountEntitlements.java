package com.javadaba.contexts.officium.domain.ports;

import java.util.Set;
import java.util.UUID;

/**
 * The entitlement ids an account holds, answered by billing (JAVA-1007). Officium asks which ids; it never
 * reads a plan or a subscription.
 */
public interface AccountEntitlements {

    Set<String> of(UUID accountId);
}
