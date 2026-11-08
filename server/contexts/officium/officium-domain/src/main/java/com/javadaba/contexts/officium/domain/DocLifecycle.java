package com.javadaba.contexts.officium.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Where a documentation page is in its life (JAVA-793, design §3): an unpublished draft only its
 * creator sees, published, archived (out of the tree and search, still readable) or in the trash
 * (gone from every read, restorable for {@link #TRASH_RETENTION}). A transition never touches the
 * page's content version, so it leaves no history revision and never clashes with an editor.
 */
public record DocLifecycle(Instant publishedAt, Instant archivedAt, Actor archivedBy, Instant deletedAt,
        Actor deletedBy) {

    public static final Duration TRASH_RETENTION = Duration.ofDays(30);

    public static DocLifecycle publishedAt(Instant at) {
        return new DocLifecycle(at, null, null, null, null);
    }

    public static DocLifecycle unpublishedDraft() {
        return new DocLifecycle(null, null, null, null, null);
    }

    public boolean published() {
        return publishedAt != null;
    }

    public boolean archived() {
        return archivedAt != null;
    }

    public boolean trashed() {
        return deletedAt != null;
    }

    /** Whoever created an unpublished draft sees it; once published, everyone in the project does. */
    public boolean visibleTo(UUID accountId, Actor creator) {
        return published() || creator.accountId().equals(accountId);
    }

    public Instant purgeAfter() {
        return deletedAt == null ? null : deletedAt.plus(TRASH_RETENTION);
    }

    public DocLifecycle publish(Instant now) {
        return published() ? this : new DocLifecycle(now, archivedAt, archivedBy, deletedAt, deletedBy);
    }

    public DocLifecycle archive(Actor actor, Instant now) {
        if (!published()) {
            throw OfficiumException.conflict("doc_unpublished",
                    "An unpublished draft cannot be archived: publish it first, or delete it");
        }
        return archived() ? this : new DocLifecycle(publishedAt, now, actor, null, null);
    }

    public DocLifecycle unarchive() {
        return new DocLifecycle(publishedAt, null, null, deletedAt, deletedBy);
    }

    public DocLifecycle trash(Actor actor, Instant now) {
        return new DocLifecycle(publishedAt, archivedAt, archivedBy, now, actor);
    }

    public DocLifecycle restore() {
        return new DocLifecycle(publishedAt, archivedAt, archivedBy, null, null);
    }
}
