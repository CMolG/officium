package com.javadaba.contexts.officium.application;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Closes the integration gate's walls when the gate clears (JAVA-1820): a merge to the default branch moves the cards
 * in Deploy to done ({@code GithubService.push}), which tells this listener, and a wall nobody needs is done. No
 * wall, no rules and no move cost one read each.
 */
@ApplicationScoped
public class IntegrationGateWallListener implements CardChangeListener {

    private final IntegrationGateService gate;

    @Inject
    public IntegrationGateWallListener(IntegrationGateService gate) {
        this.gate = gate;
    }

    @Override
    public void cardChanged(CardChange change) {
        if ("card.moved".equals(change.type())) {
            gate.recheck(change.projectId());
        }
    }
}
