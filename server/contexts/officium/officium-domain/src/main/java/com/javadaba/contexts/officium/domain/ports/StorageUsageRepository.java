package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.DocStorage;

import java.util.UUID;

/** Card data an owner keeps across all of their projects, in UTF-8 bytes ({@code StorageUsage}). */
public interface StorageUsageRepository {

    long textBytesOwnedBy(UUID ownerAccountId);

    /** What one project's documentation weighs, by kind (JAVA-794). */
    DocStorage docStorageOf(UUID projectId);
}
