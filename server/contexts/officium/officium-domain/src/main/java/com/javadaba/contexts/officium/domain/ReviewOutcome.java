package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * One exit of a card from review (card://JAVA-1526): an approval (Review to Deploy or Done) with the reviewer's
 * scorecard, or a send-back with the engineering rules it broke. Who and as which role, from and to which state.
 * Append-only. {@code scorecard} is empty for a send-back and for a person's approval that gave none;
 * {@code reviewReturnId} is the ADR 0031 send-back entry this one completes, null on an approval.
 */
public record ReviewOutcome(UUID id, UUID projectId, UUID cardId, Instant at, Actor actor, String role, Status from,
        Status to, Verdict verdict, List<QualityRule> ruleViolations, Map<QualityDimension, Score> scorecard,
        String observations, UUID reviewReturnId) {

    /** Whether the review let the card go on or sent it back. */
    public enum Verdict {
        APPROVED("approved"), SENT_BACK("sent_back");

        private final String wire;

        Verdict(String wire) {
            this.wire = wire;
        }

        public String wire() {
            return wire;
        }

        public static Verdict fromWire(String value) {
            return APPROVED.wire.equals(value) ? APPROVED : SENT_BACK;
        }
    }

    /** A reviewer's verdict on one dimension of an approved card. */
    public enum Score {
        CLEAN("clean"), MINOR_OBSERVATIONS("minor_observations");

        private final String wire;

        Score(String wire) {
            this.wire = wire;
        }

        public String wire() {
            return wire;
        }

        public static java.util.Optional<Score> find(String value) {
            return java.util.Arrays.stream(values()).filter(score -> score.wire.equals(value)).findFirst();
        }
    }

    public ReviewOutcome {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(cardId, "cardId");
        Objects.requireNonNull(at, "at");
        Objects.requireNonNull(verdict, "verdict");
        ruleViolations = ruleViolations == null ? List.of() : List.copyOf(ruleViolations);
        scorecard = scorecard == null ? Map.of() : Map.copyOf(scorecard);
    }
}
