package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;

import java.util.UUID;

/** Wire shape of {@link Actor} (contract §2: {@code kind} is {@code "person"|"agent"}, not the
 *  enum name). {@code machine} is only ever set for an agent that said where it runs (JAVA-200). */
public record ActorJson(String kind, UUID accountId, String name, String agentName, String machine) {

    public static ActorJson of(Actor actor) {
        if (actor == null) {
            return null;
        }
        return new ActorJson(actor.kind().name().toLowerCase(java.util.Locale.ROOT),
                actor.accountId(), actor.name(), actor.agentName(), actor.machine());
    }
}
