package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.PhaseRun;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** The phase runs of a project's cards (card://JAVA-1527): appended on every status change, read by metrics. */
public interface PhaseRunRepository {

    void insert(PhaseRun run);

    /** The listed cards' runs, oldest first: a period's metrics read only the cards it touched. */
    List<PhaseRun> listByCards(Collection<UUID> cardIds);

    /** Every run of the project, oldest first. */
    List<PhaseRun> listByProject(UUID projectId);
}
