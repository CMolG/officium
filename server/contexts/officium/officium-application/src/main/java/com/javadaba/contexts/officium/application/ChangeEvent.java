package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;

import java.time.Instant;
import java.util.UUID;

/**
 * One committed change, broadcast on the project's live channel (contract §4). Carries ids and a
 * version, never full bodies -- the client refetches what it shows (reconnect = refetch,
 * decided).
 */
public record ChangeEvent(
        String type,
        UUID projectId,
        UUID cardId,
        String cardKey,
        Integer version,
        String path,
        Actor actor,
        Instant at) {

    public static ChangeEvent of(String type, UUID projectId, UUID cardId, String cardKey, Integer version,
            Actor actor, Instant at) {
        return new ChangeEvent(type, projectId, cardId, cardKey, version, null, actor, at);
    }

    /** A documentation event: it names the page or node path, and the page's version when it has one. */
    public static ChangeEvent ofDoc(String type, UUID projectId, String path, Integer version, Actor actor,
            Instant at) {
        return new ChangeEvent(type, projectId, null, null, version, path, actor, at);
    }
}
