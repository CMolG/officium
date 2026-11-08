package com.javadaba.contexts.officium.domain;

/**
 * The per-project settings of the prior-failure read (card://JAVA-1803): the window in days, the budget of cards and
 * findings an answer may carry, and how many times a reason and area must recur to be flagged. Out-of-range values
 * are rejected, never clamped, so a setting says what it does.
 */
public record PriorFailureSettings(int windowDays, int maxCards, int maxFindings, int recurrenceThreshold) {

    public static final PriorFailureSettings DEFAULTS = new PriorFailureSettings(14, 5, 8, 3);

    public PriorFailureSettings {
        range("windowDays", windowDays, 1, 90);
        range("maxCards", maxCards, 1, 20);
        range("maxFindings", maxFindings, 1, 40);
        range("recurrenceThreshold", recurrenceThreshold, 2, 50);
    }

    /** The settings a project stored, with each field it leaves out at its default. */
    public static PriorFailureSettings of(Integer windowDays, Integer maxCards, Integer maxFindings,
            Integer recurrenceThreshold) {
        return new PriorFailureSettings(or(windowDays, DEFAULTS.windowDays()), or(maxCards, DEFAULTS.maxCards()),
                or(maxFindings, DEFAULTS.maxFindings()),
                or(recurrenceThreshold, DEFAULTS.recurrenceThreshold()));
    }

    private static void range(String field, int value, int min, int max) {
        if (value < min || value > max) {
            throw OfficiumException.badRequest("invalid_prior_failure_settings",
                    field + " must be between " + min + " and " + max + ", was " + value);
        }
    }

    private static int or(Integer value, int fallback) {
        return value == null ? fallback : value;
    }
}
