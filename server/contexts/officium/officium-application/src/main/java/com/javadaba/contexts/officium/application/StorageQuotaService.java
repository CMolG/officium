package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.StorageUsage;
import com.javadaba.contexts.officium.domain.ports.StorageUsageRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

/**
 * Officium Local has no storage quota: the owner uses their own disk. The service keeps its shape,
 * so every caller from the Cloud edition compiles unchanged, but every write fits.
 */
@ApplicationScoped
public class StorageQuotaService {

    private static final long UNLIMITED = Long.MAX_VALUE / 4;

    private final StorageUsageRepository usage;

    public StorageQuotaService(StorageUsageRepository usage) {
        this.usage = usage;
    }

    public StorageUsage usageOf(UUID ownerAccountId) {
        return new StorageUsage(usage.textBytesOwnedBy(ownerAccountId), UNLIMITED);
    }

    public long roomLeft(Project project) {
        return UNLIMITED;
    }

    public void requireRoom(Project project, long addedBytes) {
        // Never refuses.
    }

    public void requireRoom(Project project, StorageUsage currentUsage, long addedBytes) {
        // Never refuses.
    }
}
