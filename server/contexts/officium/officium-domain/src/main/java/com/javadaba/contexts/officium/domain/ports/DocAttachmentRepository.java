package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.DocAttachment;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * The files of documentation pages (JAVA-798). Every list leaves the bytes out: they are read one
 * file at a time, by {@link #readData}.
 */
public interface DocAttachmentRepository {

    List<DocAttachment> listByPage(UUID pageId);

    Optional<DocAttachment> find(UUID pageId, String name);

    Optional<byte[]> readData(UUID attachmentId);

    /** {@code false} when the page already holds a file of that name. */
    boolean insert(DocAttachment attachment, byte[] data);

    boolean delete(UUID pageId, String name);

    // The sweep's reads (all projects, nothing here reads bytes).

    /** Attachments created before {@code cutoff}, in every project. */
    List<DocAttachment> listCreatedBefore(Instant cutoff);

    /**
     * Path to the ids of the pages that hold it, for every page of the project, the trash included: a trashed
     * page still holds its files, and a live page and a trashed one can share a path.
     */
    Map<String, List<UUID>> pageIdsByPath(UUID projectId);

    /** The bodies of the project's pages (trash included) and kept revisions that contain {@code /_files/}. */
    List<String> bodiesReferencingFiles(UUID projectId);

    boolean deleteById(UUID id);
}
