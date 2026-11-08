package com.javadaba.contexts.officium.domain;

import java.util.Objects;
import java.util.UUID;

/**
 * Who did it -- a person at the keyboard (REST, {@code jdb_session}) or an agent through MCP
 * (OAuth). Every mutating service method takes one, so an MCP adapter (JDB-220/221, not built
 * here) calls the exact same services REST does. {@code agentName} is only ever present for
 * {@link ActorKind#AGENT}: the agent's label, "Claude Code (nickname)" (JAVA-199).
 *
 * <p>{@code machine} is the computer an agent says it runs on (JAVA-200), agents only and optional:
 * a user can have several machines, and it is what lets the autoloop on one of them recognise a
 * card it left in progress when a session died.
 */
public record Actor(ActorKind kind, UUID accountId, String name, String agentName, String machine) {

    public static final int MACHINE_MAX_LENGTH = 100;

    public Actor {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(accountId, "accountId");
        Objects.requireNonNull(name, "name");
        if (kind == ActorKind.AGENT && (agentName == null || agentName.isBlank())) {
            throw new IllegalArgumentException("An agent actor needs an agentName");
        }
        if (kind == ActorKind.PERSON && (agentName != null || machine != null)) {
            throw new IllegalArgumentException("A person actor cannot carry an agentName or a machine");
        }
        machine = machine == null || machine.isBlank() ? null : truncate(machine.strip());
    }

    public Actor(ActorKind kind, UUID accountId, String name, String agentName) {
        this(kind, accountId, name, agentName, null);
    }

    public static Actor person(UUID accountId, String name) {
        return new Actor(ActorKind.PERSON, accountId, name, null, null);
    }

    public static Actor agent(UUID accountId, String agentName) {
        return new Actor(ActorKind.AGENT, accountId, agentName, agentName, null);
    }

    public static Actor agent(UUID accountId, String agentName, String machine) {
        return new Actor(ActorKind.AGENT, accountId, agentName, agentName, machine);
    }

    /** This actor, keeping the machine {@code earlier} knew when this write didn't say one. */
    public Actor rememberingMachineOf(Actor earlier) {
        if (machine != null || earlier == null || earlier.machine() == null
                || !earlier.accountId().equals(accountId) || kind != ActorKind.AGENT) {
            return this;
        }
        return new Actor(kind, accountId, name, agentName, earlier.machine());
    }

    private static String truncate(String value) {
        return value.length() <= MACHINE_MAX_LENGTH ? value : value.substring(0, MACHINE_MAX_LENGTH);
    }
}
