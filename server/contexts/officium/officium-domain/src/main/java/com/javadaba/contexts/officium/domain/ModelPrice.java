package com.javadaba.contexts.officium.domain;

import java.time.LocalDate;

/**
 * One version of a model's published API price (card://JAVA-1047), in USD per million tokens, in
 * force from {@code from} until the next version of the same model starts. {@code source} says where
 * the figures were read and {@code checkedOn} when, so a stale row is visible rather than trusted.
 *
 * <p>Cache writes carry their own rate per TTL bucket (JAVA-1777), so the 5-minute and the 1-hour write
 * are priced as the provider bills them, not as input.
 */
public record ModelPrice(String model, LocalDate from, double inputPerMillion, double cacheWrite5mPerMillion,
        double cacheWrite1hPerMillion, double cacheReadPerMillion, double outputPerMillion, String source,
        LocalDate checkedOn) {

    public ModelPrice {
        if (model == null || model.isBlank() || from == null) {
            throw new IllegalArgumentException("a price needs a model and the date it starts");
        }
        if (inputPerMillion < 0 || cacheWrite5mPerMillion < 0 || cacheWrite1hPerMillion < 0
                || cacheReadPerMillion < 0 || outputPerMillion < 0) {
            throw new IllegalArgumentException("prices cannot be negative");
        }
    }

    /**
     * The API-equivalent cost of a usage at these prices. The cache writes are parts of {@code tokensIn}, so
     * fresh input is what is left of it; a split that handed a part more writes than input prices that
     * remainder at zero, never at a negative rate (JAVA-1777).
     */
    public double costOf(TokenUsage usage) {
        long writes = usage.cacheWrite5mTokens() + usage.cacheWrite1hTokens();
        long fresh = Math.max(0, usage.tokensIn() - writes);
        return (fresh * inputPerMillion
                + usage.cacheWrite5mTokens() * cacheWrite5mPerMillion
                + usage.cacheWrite1hTokens() * cacheWrite1hPerMillion
                + usage.cachedTokensIn() * cacheReadPerMillion
                + usage.tokensOut() * outputPerMillion) / 1_000_000d;
    }
}
