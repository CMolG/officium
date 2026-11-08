package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.AgentRun;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgentRunRepository {

    /** The card's run that hasn't ended, if any -- at most one (a partial unique index holds it). */
    Optional<AgentRun> findOpen(UUID cardId);

    AgentRun insert(AgentRun run);

    /** Renews the run; a non-null {@code machine} is recorded on its actor (JAVA-200), a null one
     *  keeps whatever it had. */
    void touch(UUID runId, Instant lastSeenAt, String machine);

    /** Each of these cards' most recent run, open or ended -- where its last agent worked from. */
    List<AgentRun> latestOf(Collection<UUID> cardIds);

    /** {@code false} when it had already ended: whoever closed it first imputed it. */
    boolean close(UUID runId, Instant endedAt);

    /** Open runs whose last sign of life is before {@code cutoff} -- what the sweep closes. */
    List<AgentRun> openSeenBefore(Instant cutoff);

    /** Open runs seen after {@code cutoff} -- the ones still alive, which a restart puts back on the board. */
    List<AgentRun> openSeenAfter(Instant cutoff);
}
