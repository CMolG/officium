package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.ChangelogEntry;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Wire shape of {@link ChangelogEntry} (contract §8.8). {@code markedBy}/{@code markedAt} are null
 *  while the entry is pending. */
public record ChangelogEntryView(UUID id, UUID projectId, String ref, String title, String url, List<String> areas,
        Instant mergedAt, String status, List<String> pages, ActorJson recordedBy, Instant recordedAt,
        ActorJson markedBy, Instant markedAt, int version) {

    public static ChangelogEntryView of(ChangelogEntry entry) {
        return new ChangelogEntryView(entry.id(), entry.projectId(), entry.ref(), entry.title(), entry.url(),
                entry.areas(), entry.mergedAt(), entry.status().wire(), entry.pages(), ActorJson.of(entry.recordedBy()),
                entry.recordedAt(), entry.markedBy() == null ? null : ActorJson.of(entry.markedBy()), entry.markedAt(),
                entry.version());
    }
}
