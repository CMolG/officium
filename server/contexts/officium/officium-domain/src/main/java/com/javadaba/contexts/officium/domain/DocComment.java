package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * A comment on a documentation page (JAVA-797). A root opens a thread and may carry the {@code quote} it is
 * about; a reply has a {@code parentId} (one level only) and never a quote. Resolution belongs to the root.
 * {@code deletedAt} marks a root with replies that was deleted: it stays as a tombstone so the replies keep
 * their thread.
 */
public record DocComment(UUID id, UUID pageId, UUID parentId, Actor author, String text, DocQuote quote,
        Instant resolvedAt, Actor resolvedBy, Instant deletedAt, Instant createdAt, Instant updatedAt) {

    public static final int MAX_TEXT = 20_000;

    public static DocComment root(UUID pageId, Actor author, String text, DocQuote quote, Instant now) {
        return new DocComment(UUID.randomUUID(), pageId, null, author, requireText(text), quote, null, null, null,
                now, now);
    }

    public static DocComment reply(DocComment root, Actor author, String text, Instant now) {
        if (root.parentId() != null) {
            throw OfficiumException.badRequest("reply_to_reply", "Reply to the thread's first comment ("
                    + root.parentId() + "), not to a reply");
        }
        return new DocComment(UUID.randomUUID(), root.pageId(), root.id(), author, requireText(text), null, null,
                null, null, now, now);
    }

    public boolean isRoot() {
        return parentId == null;
    }

    public boolean resolved() {
        return resolvedAt != null;
    }

    public boolean deleted() {
        return deletedAt != null;
    }

    /** Only the author's account edits, and a tombstone is not edited. */
    public boolean editableBy(UUID accountId) {
        return !deleted() && author.accountId().equals(accountId);
    }

    /** The author or the project's owner. */
    public boolean deletableBy(UUID accountId, boolean owner) {
        return owner || author.accountId().equals(accountId);
    }

    public DocComment withText(String newText, Instant now) {
        return new DocComment(id, pageId, parentId, author, requireText(newText), quote, resolvedAt, resolvedBy,
                deletedAt, createdAt, now);
    }

    public DocComment resolvedBy(Actor by, Instant now) {
        return new DocComment(id, pageId, parentId, author, text, quote, now, by, deletedAt, createdAt, updatedAt);
    }

    public DocComment reopened() {
        return new DocComment(id, pageId, parentId, author, text, quote, null, null, deletedAt, createdAt, updatedAt);
    }

    public DocComment tombstone(Instant now) {
        return new DocComment(id, pageId, parentId, author, "", quote, resolvedAt, resolvedBy, now, createdAt, now);
    }

    /** What this comment spends of the owner's allowance. */
    public long bytes() {
        return StorageUsage.bytesOf(text) + (quote == null ? 0 : quote.bytes());
    }

    private static String requireText(String text) {
        if (text == null || text.isBlank()) {
            throw OfficiumException.badRequest("text_required", "A comment needs text");
        }
        String stripped = text.strip();
        if (stripped.length() > MAX_TEXT) {
            throw OfficiumException.badRequest("text_too_long", "A comment has at most " + MAX_TEXT + " characters");
        }
        return stripped;
    }
}
