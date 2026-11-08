package com.javadaba.contexts.officium.domain;

/**
 * The per-project bar of the profile recommendations (card://JAVA-1804): the share of a cell's reviews that raises its
 * model, one bar for both measures. Out-of-range values, and values finer than three decimals, are refused, never
 * rounded, so the bar a project reads is the bar it set.
 */
public record ProfileRecommendationSettings(double raiseAt) {

    public static final ProfileRecommendationSettings DEFAULTS = new ProfileRecommendationSettings(0.30);

    public ProfileRecommendationSettings {
        if (!(raiseAt >= 0.05 && raiseAt <= 1.0)) {
            throw OfficiumException.badRequest("invalid_profile_recommendation_settings",
                    "raiseAt must be between 0.05 and 1, was " + raiseAt);
        }
        if (Math.abs(raiseAt * 1000 - Math.round(raiseAt * 1000)) > 1e-9) {
            throw OfficiumException.badRequest("invalid_profile_recommendation_settings",
                    "raiseAt has at most three decimals, was " + raiseAt);
        }
    }

    /** The bar a project stored, or the default when it stores none. */
    public static ProfileRecommendationSettings of(Double raiseAt) {
        return raiseAt == null ? DEFAULTS : new ProfileRecommendationSettings(raiseAt);
    }
}
