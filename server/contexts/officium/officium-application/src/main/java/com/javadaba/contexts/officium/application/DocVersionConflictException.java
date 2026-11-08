package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.VersionConflict;

/** {@code 409 {error:"version_conflict", message, current:<DocPage>}} (contract §1.3, §8.7). */
public class DocVersionConflictException extends OfficiumException implements VersionConflict {

    private final DocPageView current;

    public DocVersionConflictException(DocPageView current) {
        super("version_conflict", "The page changed since you last read it: merge onto `current` and retry with "
                + "its version", 409);
        this.current = current;
    }

    @Override
    public DocPageView current() {
        return current;
    }
}
