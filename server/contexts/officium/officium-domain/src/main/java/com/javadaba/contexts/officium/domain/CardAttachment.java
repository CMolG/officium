package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * Metadata row of a file that lives on the project's machine, not on our server (JDB-242, user
 * decision 2026-09-15). {@code path} is relative to that machine's project directory
 * ({@code .officium/attachments/} for uploads, the repository root for a {@code .backlog/} import).
 * Uploads are still ≤10MB with allowlisted content types -- enforced by
 * {@code CardAttachmentService}.
 */
public record CardAttachment(UUID id, UUID cardId, String name, long size, String contentType, String path,
        Instant createdAt) {
}
