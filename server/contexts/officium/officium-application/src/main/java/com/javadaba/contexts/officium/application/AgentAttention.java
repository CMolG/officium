package com.javadaba.contexts.officium.application;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * What an agent needs to get its person's attention (JAVA-1144, JAVA-1145): whether they have
 * Officium open, and the summons that asks them to answer. One holder, so the MCP registry, which
 * is at its size allowance, takes one parameter for both.
 */
@ApplicationScoped
public class AgentAttention {

    private final PresenceService presence;
    private final SummonsService summons;

    @Inject
    public AgentAttention(PresenceService presence, SummonsService summons) {
        this.presence = presence;
        this.summons = summons;
    }

    public PresenceService presence() {
        return presence;
    }

    public SummonsService summons() {
        return summons;
    }
}
