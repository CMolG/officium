package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.VersionConflict;

/** {@code 409 {error:"version_conflict", message, current:<Team>}} (contract §1.3, §8.5). */
public class TeamVersionConflictException extends OfficiumException implements VersionConflict {

    private final OrganizationViews.TeamView current;

    public TeamVersionConflictException(OrganizationViews.TeamView current) {
        super("version_conflict", "The team changed since you last read it", 409);
        this.current = current;
    }

    @Override
    public OrganizationViews.TeamView current() {
        return current;
    }
}
