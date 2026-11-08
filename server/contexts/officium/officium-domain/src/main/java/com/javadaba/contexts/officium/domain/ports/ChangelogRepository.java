package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.ChangelogEntry;
import com.javadaba.contexts.officium.domain.ChangelogToken;
import com.javadaba.contexts.officium.domain.DocsStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** A project's documentation changelog (JAVA-132): its entries, keyed by {@code (projectId, ref)},
 *  and the one token its pipeline records them with. */
public interface ChangelogRepository {

    /** Newest merge first; {@code status} null lists every entry. */
    List<ChangelogEntry> list(UUID projectId, DocsStatus status, int limit);

    int countPending(UUID projectId);

    Optional<ChangelogEntry> find(UUID projectId, UUID entryId);

    Optional<ChangelogEntry> findByRef(UUID projectId, String ref);

    /** {@code false} when the project already has an entry for that ref (a retry, or a race). */
    boolean insert(ChangelogEntry entry);

    /** Writes the entry's docs status, pages, marker and version. */
    boolean updateMarkIfVersion(ChangelogEntry entry, int expectedVersion);

    Optional<ChangelogToken> token(UUID projectId);

    /** Replaces the project's token, if it had one. */
    void saveToken(ChangelogToken token);

    boolean deleteToken(UUID projectId);

    Optional<UUID> projectForTokenHash(String tokenHash);
}
