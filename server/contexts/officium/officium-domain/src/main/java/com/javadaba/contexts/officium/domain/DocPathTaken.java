package com.javadaba.contexts.officium.domain;

import java.util.List;

/**
 * Marker for an {@link OfficiumException} that names the paths a move or a duplicate collided with
 * (contract §8.20: {@code 409 {error:"doc_path_taken", message, paths}}), the same shape
 * {@link VersionConflict} gives {@code current}.
 */
public interface DocPathTaken {
    List<String> paths();
}
