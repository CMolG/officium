package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Folder;

import java.time.Instant;
import java.util.UUID;

public record FolderView(UUID id, UUID parentId, String name, Instant createdAt, Instant updatedAt) {

    public static FolderView of(Folder folder) {
        return new FolderView(folder.id(), folder.parentId(), folder.name(), folder.createdAt(),
                folder.updatedAt());
    }
}
