package com.javadaba.contexts.officium.domain.ports;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Resolves a Javadaba account by email, for member invitation (contract §3, {@code POST
 * .../members {email, role}}). Implemented in {@code apps/app-api} (JDB-215): the account
 * directory lives one layer up from any single context, and a context must not depend on
 * {@code apps-api} -- app-api is allowed to implement a context's port, same relationship as a
 * session resource.
 */
public interface AccountDirectory {

    Optional<Found> findByEmail(String email);

    /**
     * Every account matching that email -- the underlying directory is best-effort (accounts
     * aren't keyed by email; a Firebase display name can collide, verified or not), so more than
     * one match is a real possibility {@link #findByEmail} silently hides by returning whichever
     * came back first. {@code ProjectMembershipService#invite} uses this one and refuses to guess
     * ({@code ambiguous_account}, contract §3 footnote).
     */
    List<Found> findAllByEmail(String email);

    /** Reverse lookup, for defaulting a {@code human} card's assignee to the project owner
     *  (contract §2) when the caller only has the owner's account id. */
    Optional<Found> findByAccountId(UUID accountId);

    record Found(UUID accountId, String email, String name) {
    }
}
