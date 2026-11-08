package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * The engineering-quality half of a review exit (card://JAVA-1526), pure so it is unit-tested directly. A
 * send-back (ADR 0031) may name the rules the work broke ({@code ruleViolations}, from {@link QualityRule}'s
 * closed vocabulary); an approval, Review to Deploy or Done, carries the reviewer's scorecard: one {@link
 * ReviewOutcome.Score} per reviewed dimension, {@code ux_and_polish} only when the card touches the UI. An agent
 * approving an {@code ai} card must send it and name the role it reviewed as; a person may leave it out.
 */
public final class ReviewQuality {

    public static final int OBSERVATIONS_MAX = 4_000;

    /** The scorecard's keys that are not a dimension. */
    public static final String OBSERVATIONS = "observations";
    public static final String ROLE = "role";

    private static final Set<Status> APPROVED_TO = Set.of(Status.DEPLOY, Status.DONE);
    private static final Pattern ROLE_ID = Pattern.compile("[a-z0-9][a-z0-9-]{0,63}");

    private ReviewQuality() {
    }

    /** What a review exit sends: a send-back's rule ids, and an approval's scorecard (dimensions, observations, role). */
    public record Request(List<String> ruleViolations, Map<String, String> scorecard) {
    }

    /** A checked review exit: what {@link ReviewOutcome} keeps besides who, when and where. */
    public record Checked(ReviewOutcome.Verdict verdict, List<QualityRule> ruleViolations,
            Map<QualityDimension, ReviewOutcome.Score> scorecard, String observations, String role) {
    }

    public static boolean isApproval(Status from, Status to) {
        return from == Status.REVIEW && APPROVED_TO.contains(to);
    }

    /**
     * Checks a move's quality request: empty when the move is no review exit, the checked exit when it is one.
     * {@code sendBackRole} is the role the ADR 0031 send-back already checked. An epic's approval is no review exit.
     */
    public static Optional<Checked> require(Card card, Status to, Request request, ActorKind by,
            List<String> eligibleRoles, String sendBackRole) {
        Status from = card.status();
        List<String> violations = request == null || request.ruleViolations() == null
                ? List.of()
                : request.ruleViolations();
        Map<String, String> scorecard = request == null ? null : request.scorecard();
        boolean sendBack = ReviewReturns.isSendBack(from, to);
        if (!sendBack && !violations.isEmpty()) {
            throw OfficiumException.badRequest("rule_violations_without_send_back",
                    "`ruleViolations` go with a send-back's `reviewReturn`, a move from review or deploy back to a "
                            + "work phase: drop them, or send the card back");
        }
        if (sendBack) {
            return Optional.of(new Checked(ReviewOutcome.Verdict.SENT_BACK, QualityRule.parseAll(violations),
                    Map.of(), null, sendBackRole));
        }
        // An epic is never worked, so its move on with its children is no review of work.
        if (!isApproval(from, to) || card.category() == Category.EPIC) {
            if (scorecard != null) {
                throw OfficiumException.badRequest("quality_scorecard_without_approval",
                        "`qualityScorecard` goes with an approval, a move from review to deploy or done");
            }
            return Optional.empty();
        }
        boolean agent = by == ActorKind.AGENT && card.executor() != Executor.HUMAN;
        if (scorecard == null) {
            if (agent) {
                throw OfficiumException.conflict(CategoryContracts.CONTRACT_UNMET, "review contract, exit: an "
                        + "approval records the reviewer's audit. Send `qualityScorecard` {" + dimensions(card)
                        + ", observations?, role} with each dimension `clean` or `minor_observations`, after checking "
                        + "the architecture, the clean code, the tests and, on a card that touches the UI, its finish. "
                        + "A failed pillar is a send-back with its `ruleViolations`, not an approval.");
            }
            return Optional.of(new Checked(ReviewOutcome.Verdict.APPROVED, List.of(), Map.of(), null, null));
        }
        return Optional.of(new Checked(ReviewOutcome.Verdict.APPROVED, List.of(), scores(card, scorecard),
                observations(scorecard.get(OBSERVATIONS)), role(scorecard.get(ROLE), agent, eligibleRoles)));
    }

    private static Map<QualityDimension, ReviewOutcome.Score> scores(Card card, Map<String, String> scorecard) {
        Map<QualityDimension, ReviewOutcome.Score> scores = new EnumMap<>(QualityDimension.class);
        for (Map.Entry<String, String> entry : scorecard.entrySet()) {
            if (entry.getKey().equals(OBSERVATIONS) || entry.getKey().equals(ROLE)) {
                continue;
            }
            QualityDimension dimension = QualityDimension.find(entry.getKey()).filter(QualityDimension::reviewed)
                    .orElseThrow(() -> OfficiumException.badRequest("quality_dimension_invalid",
                            "Unknown scorecard dimension: " + entry.getKey() + ". Score " + dimensions(card)));
            scores.put(dimension, ReviewOutcome.Score.find(entry.getValue())
                    .orElseThrow(() -> OfficiumException.badRequest("quality_score_invalid", "Score "
                            + entry.getKey() + " `clean` or `minor_observations`, not " + entry.getValue())));
        }
        List<String> missing = new ArrayList<>();
        for (QualityDimension dimension : required(card)) {
            if (!scores.containsKey(dimension)) {
                missing.add(dimension.wire());
            }
        }
        if (!missing.isEmpty()) {
            throw OfficiumException.badRequest("quality_scorecard_incomplete",
                    "The scorecard has no score for: " + String.join(", ", missing));
        }
        return scores;
    }

    /** The dimensions an approval scores: every reviewed one, {@code ux_and_polish} only on a card touching the UI. */
    static List<QualityDimension> required(Card card) {
        boolean ui = card.signals() != null && card.signals().contains(Signal.TOUCHES_UI);
        return QualityDimension.reviewedDimensions().stream()
                .filter(dimension -> ui || dimension != QualityDimension.UX_AND_POLISH).toList();
    }

    private static String dimensions(Card card) {
        return String.join(", ", required(card).stream().map(QualityDimension::wire).toList());
    }

    private static String observations(String observations) {
        if (observations == null || observations.isBlank()) {
            return null;
        }
        String stripped = observations.strip();
        if (stripped.length() > OBSERVATIONS_MAX) {
            throw OfficiumException.badRequest("quality_observations_too_long",
                    "A scorecard's observations are at most " + OBSERVATIONS_MAX + " characters");
        }
        return stripped;
    }

    private static String role(String role, boolean agent, List<String> eligibleRoles) {
        if (role == null || role.isBlank()) {
            if (agent) {
                throw OfficiumException.badRequest("quality_scorecard_role_required",
                        "An agent says the role it reviewed as in the scorecard's `role`"
                                + (eligibleRoles.isEmpty()
                                        ? ""
                                        : " (one of: " + String.join(", ", eligibleRoles) + ")"));
            }
            return null;
        }
        String id = role.strip();
        if (!ROLE_ID.matcher(id).matches() || !eligibleRoles.isEmpty() && !eligibleRoles.contains(id)) {
            throw OfficiumException.badRequest("quality_scorecard_role_invalid",
                    "`role` is not a role that reviews this card now");
        }
        return id;
    }
}
