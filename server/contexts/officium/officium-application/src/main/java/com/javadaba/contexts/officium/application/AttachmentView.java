package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.CardAttachment;

import java.time.Instant;
import java.util.UUID;

/** {@code path} is relative to the project's machine (JDB-242): there is no download URL, the
 *  file is fetched from that machine through {@code WS /officium/v1/projects/{id}/files}. */
public record AttachmentView(UUID id, UUID cardId, String name, long size, String contentType, String path,
        Instant createdAt) {

    public static AttachmentView of(CardAttachment attachment) {
        return new AttachmentView(attachment.id(), attachment.cardId(), attachment.name(), attachment.size(),
                attachment.contentType(), attachment.path(), attachment.createdAt());
    }
}
