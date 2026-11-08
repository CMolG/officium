package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.DocAttachment;
import com.javadaba.contexts.officium.domain.DocFileRefs;

import java.time.Instant;
import java.util.UUID;

/** A page's file as REST and MCP answer it (JAVA-798): never its bytes, and the reference to write into the page. */
public record DocAttachmentView(UUID id, String name, String kind, String contentType, long originalBytes,
        long storedBytes, int width, int height, String sha256, String uri, ActorJson createdBy, Instant createdAt) {

    public static DocAttachmentView of(DocAttachment a, String pagePath) {
        return new DocAttachmentView(a.id(), a.name(), a.kind().name().toLowerCase(java.util.Locale.ROOT),
                a.contentType(), a.originalBytes(), a.storedBytes(), a.width(), a.height(), a.sha256(),
                DocFileRefs.uri(pagePath, a.name()), ActorJson.of(a.createdBy()), a.createdAt());
    }
}
