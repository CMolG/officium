package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Sprint;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface SprintRepository {

    Sprint insert(Sprint sprint);

    Optional<Sprint> findById(UUID projectId, UUID sprintId);

    /** Every sprint of the project, in no particular order -- the service orders them for the wire. */
    List<Sprint> listByProject(UUID projectId);

    Optional<Sprint> findActive(UUID projectId);

    /** The number the next sprint takes ({@code "<KEY> Sprint <n>"}), never reused. */
    int nextNumber(UUID projectId);

    /** Full-row optimistic update; {@code false} = version mismatch. {@code false} too when it would
     *  make a second active sprint, which the database refuses. */
    boolean updateIfVersion(Sprint updated, int expectedVersion);

    /** Its cards go back to the backlog ({@code on delete set null}). */
    boolean deleteIfVersion(UUID projectId, UUID sprintId, int expectedVersion);

    /** Per sprint: how many non-deleted cards it holds, how many aren't finished, their estimate. */
    Map<UUID, Counts> counts(UUID projectId);

    record Counts(int cardCount, int openCardCount, double estimate) {
        public static final Counts EMPTY = new Counts(0, 0, 0);
    }
}
