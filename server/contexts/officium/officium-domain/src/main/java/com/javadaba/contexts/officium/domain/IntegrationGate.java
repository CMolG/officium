package com.javadaba.contexts.officium.domain;

import java.util.Arrays;

/**
 * A project's integration gate (JAVA-1820): three rules that stop the autoloop when work piles up behind a branch
 * nobody merged. Every rule is off until the owner turns it on; a project with no row has them all off.
 */
public final class IntegrationGate {

    public static final int QUEUE_MAX_LOW = 1;
    public static final int QUEUE_MAX_HIGH = 500;
    static final Priority DEFAULT_MIN_PRIORITY = Priority.HIGH;
    static final int DEFAULT_QUEUE_MAX = 5;

    private IntegrationGate() {
    }

    /** A card waiting on a card in Deploy is held; the gate opens when a held card is at least {@code minPriority}. */
    public record HeldByDeploy(boolean enabled, Priority minPriority) {
    }

    /** The gate opens when {@code max} open cards or more wait in Deploy. */
    public record DeployQueue(boolean enabled, int max) {
    }

    /** The gate opens when no card can be handed out and some still wait in Deploy. */
    public record NothingElse(boolean enabled) {
    }

    public record Rules(HeldByDeploy heldByDeploy, DeployQueue deployQueue, NothingElse nothingElse) {

        public static final Rules OFF = new Rules(new HeldByDeploy(false, DEFAULT_MIN_PRIORITY),
                new DeployQueue(false, DEFAULT_QUEUE_MAX), new NothingElse(false));

        public boolean anyEnabled() {
            return heldByDeploy.enabled() || deployQueue.enabled() || nothingElse.enabled();
        }
    }

    /** The rules as a client sends them: absent fields take their defaults, wire values are checked by {@link #rules}. */
    public record Input(Boolean heldEnabled, String heldMinPriority, Boolean queueEnabled, Integer queueMax,
            Boolean nothingElseEnabled) {
    }

    /** The rules {@code input} says, or the {@code 422 integration_gate_invalid} naming the field that broke. */
    public static Rules rules(Input input) {
        Priority min = DEFAULT_MIN_PRIORITY;
        if (input.heldMinPriority() != null) {
            min = Arrays.stream(Priority.values()).filter(p -> p.wire().equals(input.heldMinPriority())).findFirst()
                    .orElseThrow(() -> new InvalidException("heldByDeploy.minPriority",
                            "minPriority is one of superHigh, high, medium, low, superLow."));
        }
        int max = input.queueMax() == null ? DEFAULT_QUEUE_MAX : input.queueMax();
        if (max < QUEUE_MAX_LOW || max > QUEUE_MAX_HIGH) {
            throw new InvalidException("deployQueue.max",
                    "max is a whole number from " + QUEUE_MAX_LOW + " to " + QUEUE_MAX_HIGH + ".");
        }
        return new Rules(new HeldByDeploy(Boolean.TRUE.equals(input.heldEnabled()), min),
                new DeployQueue(Boolean.TRUE.equals(input.queueEnabled()), max),
                new NothingElse(Boolean.TRUE.equals(input.nothingElseEnabled())));
    }

    /** {@code 422 integration_gate_invalid}; {@code field} names the rule setting that broke. */
    public static final class InvalidException extends OfficiumException {

        private final String field;

        InvalidException(String field, String message) {
            super("integration_gate_invalid", message, 422);
            this.field = field;
        }

        public String field() {
            return field;
        }
    }
}
