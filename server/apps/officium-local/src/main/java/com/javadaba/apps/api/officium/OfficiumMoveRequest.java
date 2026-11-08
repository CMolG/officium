package com.javadaba.apps.api.officium;

import com.javadaba.contexts.officium.domain.RejectionRules;
import com.javadaba.contexts.officium.domain.ReviewReturns;

import java.util.Map;

/**
 * The body of a card move. {@code rejection} {reason, note, card}: only with {@code status: "rejected"}
 * (card://JAVA-1415). {@code reviewReturn} {reasons, findings, role?}: only with a send-back from review or deploy
 * to a work phase, and then required (card://JAVA-1416); its {@code ruleViolations} name the engineering rules the
 * work broke. {@code qualityScorecard} {<dimension>: clean | minor_observations, observations?, role?}: only with an
 * approval, review to deploy or done (card://JAVA-1526). {@code role}: the eligible role the mover ran the phase it
 * leaves as, kept with the phase run Contributions reads by AI profile (card://JAVA-1527).
 */
public record OfficiumMoveRequest(int expectedVersion, String status, int position, RejectionRules.Request rejection,
        ReviewReturns.Request reviewReturn, Map<String, String> qualityScorecard, String role) {
}
