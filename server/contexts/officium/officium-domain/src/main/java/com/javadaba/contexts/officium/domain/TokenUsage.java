package com.javadaba.contexts.officium.domain;

/**
 * The tokens a model spent (JAVA-245). {@code tokensIn} is input read at full price (fresh input and
 * cache writes), {@code cachedTokensIn} input read from the prompt cache, {@code tokensOut} everything
 * generated, and {@code reasoningTokens} the part of {@code tokensOut} spent thinking -- a subset, not
 * an addend. {@code cacheWrite5mTokens} and {@code cacheWrite1hTokens} are the two TTL buckets of the
 * cache writes, parts of {@code tokensIn} too (JAVA-1777): a split may hand a part more writes than its
 * input, so the rule is checked at the REST boundary and fresh input is clamped when priced.
 */
public record TokenUsage(long tokensIn, long cachedTokensIn, long reasoningTokens, long tokensOut,
        long cacheWrite5mTokens, long cacheWrite1hTokens) {

    public static final TokenUsage ZERO = new TokenUsage(0, 0, 0, 0);

    public TokenUsage(long tokensIn, long cachedTokensIn, long reasoningTokens, long tokensOut) {
        this(tokensIn, cachedTokensIn, reasoningTokens, tokensOut, 0, 0);
    }

    public TokenUsage {
        if (tokensIn < 0 || cachedTokensIn < 0 || reasoningTokens < 0 || tokensOut < 0
                || cacheWrite5mTokens < 0 || cacheWrite1hTokens < 0) {
            throw new IllegalArgumentException("token counts cannot be negative");
        }
    }

    public TokenUsage plus(TokenUsage other) {
        return new TokenUsage(tokensIn + other.tokensIn, cachedTokensIn + other.cachedTokensIn,
                reasoningTokens + other.reasoningTokens, tokensOut + other.tokensOut,
                cacheWrite5mTokens + other.cacheWrite5mTokens, cacheWrite1hTokens + other.cacheWrite1hTokens);
    }

    public TokenUsage minus(TokenUsage other) {
        return new TokenUsage(tokensIn - other.tokensIn, cachedTokensIn - other.cachedTokensIn,
                reasoningTokens - other.reasoningTokens, tokensOut - other.tokensOut,
                cacheWrite5mTokens - other.cacheWrite5mTokens, cacheWrite1hTokens - other.cacheWrite1hTokens);
    }

    /** This usage scaled by {@code share} (0..1), rounded down: whoever splits it hands the remainder
     *  to the last part, so the parts always add up to the whole. */
    public TokenUsage scaled(double share) {
        return new TokenUsage((long) (tokensIn * share), (long) (cachedTokensIn * share),
                (long) (reasoningTokens * share), (long) (tokensOut * share),
                (long) (cacheWrite5mTokens * share), (long) (cacheWrite1hTokens * share));
    }

    public boolean isZero() {
        return tokensIn == 0 && cachedTokensIn == 0 && reasoningTokens == 0 && tokensOut == 0
                && cacheWrite5mTokens == 0 && cacheWrite1hTokens == 0;
    }
}
