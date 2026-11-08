package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Folder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FolderRepository {

    Folder insert(Folder folder);

    Optional<Folder> findById(UUID id);

    List<Folder> listByOwner(UUID ownerAccountId);

    Folder update(Folder folder);

    void delete(UUID id);

    /** Whether any project still points at this folder -- {@code folder_not_empty} guard. */
    boolean hasProjects(UUID id);

    /** Whether any other folder still has this one as its parent -- same guard, one level up. */
    boolean hasChildFolders(UUID id);
}
