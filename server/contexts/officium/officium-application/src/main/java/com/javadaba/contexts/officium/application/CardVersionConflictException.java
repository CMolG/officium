package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.VersionConflict;

/** {@code 409 {error:"version_conflict", message, current:<Card>}} (contract §1.3). */
public class CardVersionConflictException extends OfficiumException implements VersionConflict {

    private final CardView current;

    public CardVersionConflictException(CardView current) {
        super("version_conflict", "The card changed since you last read it", 409);
        this.current = current;
    }

    @Override
    public CardView current() {
        return current;
    }
}
