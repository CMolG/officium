package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Project;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository {

    Project insert(Project project);

    Optional<Project> findById(UUID id);

    /** Every project the account can see: owns, is an invited member of (any role), or belongs to a
     *  team that is granted it. */
    List<Project> listForAccount(UUID accountId, UUID folderId, boolean includeFolderFilter, Boolean archived);

    /** The projects the account owns, archived included -- whose people the Organization view lists. */
    List<Project> listOwnedBy(UUID ownerAccountId);

    boolean existsKeyPrefix(UUID ownerAccountId, String keyPrefix);

    /** Full-row optimistic update (name, folderId, archivedAt); {@code false} = version mismatch. */
    boolean updateIfVersion(Project updated, int expectedVersion);

    /** Atomically allocates the next sequential card number for this project ({@code 1, 2, 3...}),
     *  shared by every card of the project regardless of {@code executor} (contract, JDB-214). */
    int allocateCardNumber(UUID projectId);

    /**
     * Deletes the project and, through the schema's {@code ON DELETE CASCADE} keys, everything that
     * belongs to it (cards and their children, documentation, members, sprints, tokens, history),
     * in one statement and so one transaction. {@code false} = there was no such project.
     */
    boolean delete(UUID projectId);
}
