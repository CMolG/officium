package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.ActivityEntry;

import java.time.Instant;
import java.util.UUID;

/** Wire shape of {@link ActivityEntry} -- same reason every other view exists: {@code actor.kind}
 *  must serialize as {@code "person"|"agent"}, not the raw {@link
 *  com.javadaba.contexts.officium.domain.ActorKind} enum name. Bug found in review: the REST
 *  activity endpoint used to return {@link ActivityEntry} straight, which leaked {@code "PERSON"}. */
public record ActivityView(UUID id, UUID projectId, UUID cardId, String cardKey, ActorJson actor, String operation,
        String summary, Instant at) {

    public static ActivityView of(ActivityEntry entry) {
        return new ActivityView(entry.id(), entry.projectId(), entry.cardId(), entry.cardKey(),
                ActorJson.of(entry.actor()), entry.operation(), entry.summary(), entry.at());
    }
}
