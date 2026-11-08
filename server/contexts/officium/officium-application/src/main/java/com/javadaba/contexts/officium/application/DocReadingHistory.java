package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.ports.DocStarRepository;
import com.javadaba.contexts.officium.domain.ports.DocViewRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.UUID;

/**
 * A person's stars and recent pages are personal data, kept only while they can read the project (JAVA-1478,
 * contract §8.21). Whether they still can is the guard's rule, never re-derived here: someone who keeps another
 * way in (a direct membership, another team) keeps theirs.
 */
@ApplicationScoped
public class DocReadingHistory {

    private final ProjectAccessGuard guard;
    private final DocStarRepository stars;
    private final DocViewRepository views;

    public DocReadingHistory(ProjectAccessGuard guard, DocStarRepository stars, DocViewRepository views) {
        this.guard = guard;
        this.stars = stars;
        this.views = views;
    }

    /** Called after the write that may have ended access, so the guard already sees it. */
    public void forgetLeavers(Collection<UUID> projectIds, Collection<UUID> accountIds) {
        for (UUID projectId : projectIds) {
            for (UUID accountId : accountIds) {
                if (!guard.hasAccess(projectId, accountId)) {
                    stars.forget(projectId, accountId);
                    views.forget(projectId, accountId);
                }
            }
        }
    }
}
