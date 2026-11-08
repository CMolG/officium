package com.javadaba.contexts.officium.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Which attachments the sweep deletes (JAVA-798): the ones no page body (trash included) and no
 * kept revision points at. An upload is kept for an hour first, because the page that will
 * reference it is saved after the upload, not with it.
 */
public final class DocAttachmentGarbage {

    public static final Duration GRACE = Duration.ofHours(1);

    /** A reference resolved to the page that holds the file. */
    public record Key(UUID pageId, String name) {
    }

    private DocAttachmentGarbage() {
    }

    public static List<DocAttachment> of(List<DocAttachment> all, Set<Key> referenced, Instant now) {
        Instant cutoff = now.minus(GRACE);
        return all.stream()
                .filter(a -> a.createdAt().isBefore(cutoff))
                .filter(a -> !referenced.contains(new Key(a.pageId(), a.name())))
                .toList();
    }
}
