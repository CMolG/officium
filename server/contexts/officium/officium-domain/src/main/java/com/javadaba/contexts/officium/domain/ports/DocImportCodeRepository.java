package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.DocImportCode;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** The one-time codes of bulk documentation imports (JAVA-778), by their hash. */
public interface DocImportCodeRepository {

    void save(DocImportCode code);

    Optional<DocImportCode> findByCodeHash(String codeHash);

    /** Ends the import: false when it was already closed. */
    boolean close(UUID id, Instant now);

    /** Codes of the project still usable at {@code now}. */
    int countLive(UUID projectId, Instant now);

    /** Drops every code that lapsed or was closed: the table only ever holds live ones. */
    void deleteSpent(Instant now);
}
