package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.VersionConflict;

/** {@code 409 {error:"version_conflict", message, current:<Sprint>}} (contract §1.3, §8.2). */
public class SprintVersionConflictException extends OfficiumException implements VersionConflict {

    private final SprintView current;

    public SprintVersionConflictException(SprintView current) {
        super("version_conflict", "The sprint changed since you last read it", 409);
        this.current = current;
    }

    @Override
    public SprintView current() {
        return current;
    }
}
