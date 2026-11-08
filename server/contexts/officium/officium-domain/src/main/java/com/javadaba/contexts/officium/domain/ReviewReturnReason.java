package com.javadaba.contexts.officium.domain;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Why a card was sent back from review or deploy to a work phase (card://JAVA-1416): a closed list,
 * so every reviewer classifies a send-back the same way and the board can count where reviews fail.
 * {@link #INTEGRATION_FAILED} is the loop's commonest failure (the branch does not merge, or is red
 * once merged) and says nothing about the author's work.
 */
public enum ReviewReturnReason {
    ACCEPTANCE_UNMET("acceptance-unmet", "Acceptance unmet", "A criterion of the card is not met."), CONTRACT_UNMET(
            "contract-unmet", "Contract unmet",
            "The category's exit lines are missing or untrue."), TESTS_MISSING_OR_RED("tests-missing-or-red",
                    "Tests missing or red",
                    "The change has no test pinning it, or a test is red."), PLAN_NOT_FOLLOWED("plan-not-followed",
                            "Plan not followed",
                            "The work departs from the card's action plan."), REGRESSION("regression", "Regression",
                                    "The change breaks something that worked."), DESIGN_OR_UX("design-or-ux",
                                            "Design or UX",
                                            "The design, copy or interaction needs to change."), SCOPE_DRIFT(
                                                    "scope-drift", "Scope drift",
                                                    "The change does more, or less, than the card asked."), INTEGRATION_FAILED(
                                                            "integration-failed", "Integration failed",
                                                            "The branch does not merge, or is red once merged."), OTHER(
                                                                    "other", "Other",
                                                                    "None of these: the findings say what was wrong.");

    private final String wire;
    private final String label;
    private final String hint;

    ReviewReturnReason(String wire, String label, String hint) {
        this.wire = wire;
        this.label = label;
        this.hint = hint;
    }

    public String wire() {
        return wire;
    }

    public String label() {
        return label;
    }

    public String hint() {
        return hint;
    }

    public static ReviewReturnReason fromWire(String value) {
        return Arrays.stream(values())
                .filter(r -> r.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> OfficiumException.badRequest("review_return_reason_invalid",
                        "Unknown send-back reason: " + value + ". One of: " + wires()));
    }

    public static String wires() {
        return Arrays.stream(values()).map(ReviewReturnReason::wire).collect(Collectors.joining(", "));
    }
}
