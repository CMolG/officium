package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.CollaboratorQuota;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.ports.CollaboratorRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * The collaborators an owner includes across all their projects (JAVA-1009). Counted per owner, so
 * ten projects with four people each are still four people. Only a change that brings a NEW person
 * past the cap is refused: the same person on a second project, a role change and any removal never
 * are, and an owner already over the cap keeps everyone (grandfathered).
 *
 * <p>The cap is a constant until Business exists (JAVA-1010 replaces it with the entitlement
 * lookup). Every entry point that gives someone access calls {@link #requireRoomFor}: that is the
 * rule, and a new path that skips it lets the cap be passed.
 */
@ApplicationScoped
public class CollaboratorQuotaService {

    /** user decision 2026-10-06: Free and Personal alike; a fifth person means Business. */
    static final int INCLUDED = 3;

    private final CollaboratorRepository collaborators;

    public CollaboratorQuotaService(CollaboratorRepository collaborators) {
        this.collaborators = collaborators;
    }

    public CollaboratorQuota quotaOf(UUID ownerAccountId) {
        return new CollaboratorQuota(collaborators.collaboratorsOf(ownerAccountId).size(), INCLUDED);
    }

    /**
     * Refuses when the {@code joining} accounts include someone the owner does not count yet and the
     * total would pass the cap. Nothing is written by a refused call: the caller checks first.
     *
     * <p>Concurrent adds can both pass at two of three and end at four: the check reads, then the
     * write follows, with no lock between them. Accepted: this is a product limit, not a security
     * boundary, and the next add re-reads the true count and refuses.
     */
    public void requireRoomFor(UUID ownerAccountId, Collection<UUID> joining) {
        Set<UUID> current = collaborators.collaboratorsOf(ownerAccountId);
        Set<UUID> added = new LinkedHashSet<>(joining);
        added.remove(ownerAccountId);
        added.removeAll(current);
        if (added.isEmpty() || current.size() + added.size() <= INCLUDED) {
            return;
        }
        throw OfficiumException.forbidden("business_plan_required", String.format(Locale.ROOT,
                "Your account includes up to %d collaborators across all your projects, and %d people already "
                        + "have access. More people need the Business plan. To make room now, remove someone.",
                INCLUDED, current.size()));
    }
}
