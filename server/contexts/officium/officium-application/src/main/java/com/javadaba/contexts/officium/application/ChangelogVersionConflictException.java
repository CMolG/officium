package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.VersionConflict;

/** {@code 409 {error:"version_conflict", message, current:<ChangelogEntry>}} (contract §1.3, §8.8). */
public class ChangelogVersionConflictException extends OfficiumException implements VersionConflict {

    private final ChangelogEntryView current;

    public ChangelogVersionConflictException(ChangelogEntryView current) {
        super("version_conflict", "The change was marked since you last read it: read `current` and retry with "
                + "its version", 409);
        this.current = current;
    }

    @Override
    public ChangelogEntryView current() {
        return current;
    }
}
