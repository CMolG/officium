package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * The rules of a send-back (card://JAVA-1416), pure so they are unit-tested directly. A send-back is a move
 * from review or deploy to refine, to do, doing or ready; it carries at least one reason from
 * {@link ReviewReturnReason} and the findings, and nothing else is one: deploy to review, a move to rejected,
 * reopening a completed card, ready to to do.
 */
public final class ReviewReturns {

    public static final int FINDINGS_MAX = 20_000;

    private static final Set<Status> FROM = Set.of(Status.REVIEW, Status.DEPLOY);
    private static final Set<Status> TO = Set.of(Status.REFINE, Status.TODO, Status.DOING, Status.READY);
    private static final Pattern ROLE_ID = Pattern.compile("[a-z0-9][a-z0-9-]{0,63}");

    private ReviewReturns() {
    }

    /**
     * What a move sent as its send-back: reason wire ids, the findings text, the role the mover reviewed as, and the
     * engineering rules the work broke ({@code <dimension>:<rule>} ids, card://JAVA-1526; checked by
     * {@link ReviewQuality}).
     */
    public record Request(List<String> reasons, String findings, String role, List<String> ruleViolations) {

        public Request(List<String> reasons, String findings, String role) {
            this(reasons, findings, role, List.of());
        }
    }

    /** What a checked send-back is: the reasons as enums, the findings stripped, the role (null for a person who gave none). */
    public record Checked(List<ReviewReturnReason> reasons, String findings, String role) {
    }

    public static boolean isSendBack(Status from, Status to) {
        return FROM.contains(from) && TO.contains(to);
    }

    /**
     * Checks {@code from}'s move to {@code to}: empty when it is not a send-back and none was given, the
     * checked send-back when it is one.
     *
     * @param eligibleRoles the role ids eligible for the card at its current status; an agent's role must be
     *                      one of them, or any well-formed id when the list is empty
     */
    public static java.util.Optional<Checked> require(Status from, Status to, Request request, ActorKind by,
            List<String> eligibleRoles) {
        boolean sendBack = isSendBack(from, to);
        if (!sendBack) {
            if (request != null) {
                throw OfficiumException.badRequest("review_return_without_send_back",
                        "`reviewReturn` goes with a send-back, a move from review or deploy back to refine, "
                                + "to do, doing or ready: drop it, or send the card back");
            }
            return java.util.Optional.empty();
        }
        if (request == null) {
            throw OfficiumException.badRequest("review_return_required", "Sending a card back from " + from.wire()
                    + " needs a reason (" + ReviewReturnReason.wires() + ") and the findings: give `reviewReturn`");
        }
        List<ReviewReturnReason> reasons = reasons(request.reasons());
        String findings = findings(request.findings());
        String role = role(request.role(), by, eligibleRoles);
        return java.util.Optional.of(new Checked(reasons, findings, role));
    }

    private static List<ReviewReturnReason> reasons(List<String> wires) {
        if (wires == null || wires.isEmpty()) {
            throw OfficiumException.badRequest("review_return_reason_required",
                    "A send-back needs at least one reason (" + ReviewReturnReason.wires() + ")");
        }
        List<ReviewReturnReason> reasons = new ArrayList<>();
        for (String wire : wires) {
            ReviewReturnReason reason = ReviewReturnReason.fromWire(wire == null ? "" : wire.strip());
            if (reasons.contains(reason)) {
                throw OfficiumException.badRequest("review_return_reason_repeated",
                        "The reason " + reason.wire() + " is given twice: name each once");
            }
            reasons.add(reason);
        }
        return reasons;
    }

    private static String findings(String findings) {
        if (findings == null || findings.isBlank()) {
            throw OfficiumException.badRequest("review_return_findings_required",
                    "Say what was wrong in `findings`: it is the comment the author reads first");
        }
        String stripped = findings.strip();
        if (stripped.length() > FINDINGS_MAX) {
            throw OfficiumException.badRequest("review_return_findings_too_long",
                    "A send-back's findings are at most " + FINDINGS_MAX + " characters; these have "
                            + stripped.length());
        }
        return stripped;
    }

    private static String role(String role, ActorKind by, List<String> eligibleRoles) {
        if (role == null || role.isBlank()) {
            if (by == ActorKind.AGENT) {
                throw OfficiumException.badRequest("review_return_role_required",
                        "An agent says the role it reviewed as in `role`" + roleHint(eligibleRoles));
            }
            return null;
        }
        String id = role.strip();
        if (!ROLE_ID.matcher(id).matches() || !eligibleRoles.isEmpty() && !eligibleRoles.contains(id)) {
            throw OfficiumException.badRequest("review_return_role_invalid",
                    "`role` is not a role that works this card now" + roleHint(eligibleRoles));
        }
        return id;
    }

    private static String roleHint(List<String> eligibleRoles) {
        return eligibleRoles.isEmpty() ? "" : " (one of: " + String.join(", ", eligibleRoles) + ")";
    }
}
