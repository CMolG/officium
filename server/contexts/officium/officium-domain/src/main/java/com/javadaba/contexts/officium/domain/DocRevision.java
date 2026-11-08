package com.javadaba.contexts.officium.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * A version a page used to be (JAVA-794, design §4). {@code weightBytes} is what the version
 * weighed when it retired -- title plus body, plus the stored bytes of the attachments its body references -- and decides
 * which version is the heaviest. {@code heaviest} marks the one revision per page that never
 * expires.
 */
public record DocRevision(UUID id, UUID projectId, UUID pageId, int version, String title, String body,
        long weightBytes, Actor author, Instant writtenAt, Instant retiredAt, boolean heaviest) {

    public DocRevision {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(pageId, "pageId");
        Objects.requireNonNull(retiredAt, "retiredAt");
    }

    /** The page as it stood just before a write replaced it. */
    public static DocRevision retiring(DocPage page, Instant now) {
        return new DocRevision(UUID.randomUUID(), page.projectId(), page.id(), page.version(), page.title(),
                page.body(), StorageUsage.bytesOf(page.title(), page.body()), page.updatedBy(), page.updatedAt(),
                now, false);
    }

    public DocRevision withHeaviest(boolean flag) {
        return flag == heaviest
                ? this
                : new DocRevision(id, projectId, pageId, version, title, body, weightBytes, author, writtenAt,
                        retiredAt, flag);
    }

    /** {@code null} for the heaviest, which never expires. */
    public Instant expiresAt(int historyDays) {
        return heaviest ? null : retiredAt.plus(Duration.ofDays(historyDays));
    }

    /** Same version, weighing {@code weight}: its title and body plus the attachments its body references (JAVA-798). */
    public DocRevision withWeightBytes(long weight) {
        return new DocRevision(id, projectId, pageId, version, title, body, weight, author, writtenAt, retiredAt,
                heaviest);
    }

    /** What the revision spends of the owner's allowance: title and body, never {@code weightBytes}. */
    public long bytes() {
        return StorageUsage.bytesOf(title, body);
    }
}
