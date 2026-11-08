package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.EscapedDefect;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** The escaped-defect log of origin cards (card://JAVA-1525). Append-only. */
public interface EscapedDefectRepository {

    /** Appends the entry unless its (origin, corrective) pair is already logged; whether it was appended. */
    boolean recordIfAbsent(EscapedDefect defect);

    /** The escaped defects of each listed origin card, oldest first, keyed by origin. */
    Map<UUID, List<EscapedDefect>> listByOrigins(Collection<UUID> originCardIds);

    /** Every escaped defect of the project, oldest first. */
    List<EscapedDefect> listByProject(UUID projectId);
}
