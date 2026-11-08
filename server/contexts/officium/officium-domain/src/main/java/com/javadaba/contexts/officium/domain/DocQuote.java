package com.javadaba.contexts.officium.domain;

/**
 * A W3C TextQuoteSelector (JAVA-797): the words a comment is about, and a little of what stands around
 * them. {@code prefix} and {@code suffix} only break ties between several places the words stand.
 */
public record DocQuote(String exact, String prefix, String suffix) {

    public static final int MAX_EXACT = 5000;
    public static final int MAX_CONTEXT = 64;

    public DocQuote {
        if (exact == null || DocQuoteMatch.wordsOf(exact).isEmpty()) {
            throw OfficiumException.badRequest("quote_needs_words", "A quote needs at least one word");
        }
        if (exact.length() > MAX_EXACT) {
            throw OfficiumException.badRequest("quote_too_long",
                    "A quote has at most " + MAX_EXACT + " characters");
        }
        prefix = clip(prefix, true);
        suffix = clip(suffix, false);
    }

    public static DocQuote of(String exact) {
        return new DocQuote(exact, "", "");
    }

    public long bytes() {
        return StorageUsage.bytesOf(exact, prefix, suffix);
    }

    private static String clip(String value, boolean keepEnd) {
        if (value == null) {
            return "";
        }
        if (value.length() <= MAX_CONTEXT) {
            return value;
        }
        return keepEnd ? value.substring(value.length() - MAX_CONTEXT) : value.substring(0, MAX_CONTEXT);
    }
}
