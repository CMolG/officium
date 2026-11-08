package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Folder;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.ports.FolderRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Folders are per-owner only (v1): no sharing at this level, unlike {@code Project} membership.
 * "A folder with 10 projects has 10 different backlogs" (program §2) is enforced by
 * {@code ProjectService}, not here -- a folder is just a grouping label.
 *
 * <p>Folder mutations don't append an {@code ActivityEntry}: the shape (contract §2) is
 * project-scoped ({@code projectId} required) and a folder isn't a project. Declared deviation
 * from contract §1.5's "every mutation", scoped to the one aggregate that predates having a
 * project at all.
 */
@ApplicationScoped
public class FolderService {

    private final FolderRepository folders;
    private final Clock clock;

    @Inject
    public FolderService(FolderRepository folders) {
        this(folders, Clock.systemUTC());
    }

    FolderService(FolderRepository folders, Clock clock) {
        this.folders = folders;
        this.clock = clock;
    }

    public List<Folder> list(UUID ownerAccountId) {
        return folders.listByOwner(ownerAccountId);
    }

    public Folder create(UUID ownerAccountId, String name, UUID parentId) {
        if (parentId != null) {
            requireOwned(ownerAccountId, parentId);
        }
        Instant now = Instant.now(clock);
        return folders.insert(new Folder(UUID.randomUUID(), ownerAccountId, parentId, requireName(name), now, now));
    }

    public Folder update(UUID ownerAccountId, UUID id, String name, UUID parentId) {
        Folder existing = requireOwned(ownerAccountId, id);
        if (parentId != null) {
            if (parentId.equals(id)) {
                throw OfficiumException.badRequest("folder_cannot_be_its_own_parent",
                        "A folder cannot be its own parent");
            }
            requireOwned(ownerAccountId, parentId);
        }
        Folder updated = new Folder(existing.id(), ownerAccountId, parentId != null ? parentId : existing.parentId(),
                name != null ? requireName(name) : existing.name(), existing.createdAt(), Instant.now(clock));
        return folders.update(updated);
    }

    public void delete(UUID ownerAccountId, UUID id) {
        requireOwned(ownerAccountId, id);
        if (folders.hasProjects(id) || folders.hasChildFolders(id)) {
            throw OfficiumException.conflict("folder_not_empty", "Move or delete its projects and subfolders first");
        }
        folders.delete(id);
    }

    private Folder requireOwned(UUID ownerAccountId, UUID id) {
        return folders.findById(id)
                .filter(f -> f.ownerAccountId().equals(ownerAccountId))
                .orElseThrow(() -> OfficiumException.notFound("folder_not_found", "No such folder"));
    }

    private String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw OfficiumException.badRequest("name_required", "A folder needs a name");
        }
        return name.strip();
    }
}
