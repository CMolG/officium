package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.VersionConflict;

/** {@code 409 {error:"version_conflict", message, current:<DocTreeView.Node>}} (contract §8.17). */
public class DocNodeConflictException extends OfficiumException implements VersionConflict {

    private final DocTreeView.Node current;

    public DocNodeConflictException(DocTreeView.Node current) {
        super("version_conflict", "The node changed since you last read it: retry with the version in `current`", 409);
        this.current = current;
    }

    @Override
    public DocTreeView.Node current() {
        return current;
    }
}
