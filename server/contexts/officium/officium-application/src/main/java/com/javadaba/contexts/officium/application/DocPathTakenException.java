package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.DocPathTaken;
import com.javadaba.contexts.officium.domain.OfficiumException;

import java.util.List;

/** {@code 409 {error:"doc_path_taken", message, paths}} (contract §8.20). */
public class DocPathTakenException extends OfficiumException implements DocPathTaken {

    private final List<String> paths;

    public DocPathTakenException(List<String> paths) {
        super("doc_path_taken", "Already taken: " + String.join(", ", paths), 409);
        this.paths = List.copyOf(paths);
    }

    @Override
    public List<String> paths() {
        return paths;
    }
}
