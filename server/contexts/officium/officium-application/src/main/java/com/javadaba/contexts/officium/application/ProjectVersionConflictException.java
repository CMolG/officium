package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.VersionConflict;

/** {@code 409 {error:"version_conflict", message, current:<Project>}} (contract §1.3). */
public class ProjectVersionConflictException extends OfficiumException implements VersionConflict {

    private final ProjectView current;

    public ProjectVersionConflictException(ProjectView current) {
        super("version_conflict", "The project changed since you last read it", 409);
        this.current = current;
    }

    @Override
    public ProjectView current() {
        return current;
    }
}
