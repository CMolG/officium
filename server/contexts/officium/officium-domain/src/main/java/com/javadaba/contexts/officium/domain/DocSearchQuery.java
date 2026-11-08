package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * A documentation search (JAVA-800): the text with Outline's operators plus optional, additive
 * filters. {@code state} null is the default set, published pages and the caller's own drafts.
 * {@code limit} null returns every match.
 */
public record DocSearchQuery(String text, String collection, UUID author, Instant updatedAfter, Instant updatedBefore,
        String state, Integer limit, int offset) {

    public static final int MAX_LIMIT = 100;
    /** Snippets are built for this many results of a response; later ones come without. */
    public static final int SNIPPETS = 25;
    private static final Set<String> STATES = Set.of("published", "unpublished", "archived");

    /** Validates what a caller sent; every problem is a 400 with its own code. */
    public static DocSearchQuery of(String text, String collection, String author, String updatedAfter,
            String updatedBefore, String state, Integer limit, Integer offset) {
        if (text == null || text.isBlank()) {
            throw OfficiumException.badRequest("text_required", "Say what to search the pages for");
        }
        Instant after = instant(updatedAfter);
        Instant before = instant(updatedBefore);
        if (after != null && before != null && after.isAfter(before)) {
            throw OfficiumException.badRequest("invalid_updated_range", "`updatedAfter` is later than `updatedBefore`");
        }
        if (limit != null && (limit < 1 || limit > MAX_LIMIT) || offset != null && offset < 0) {
            throw OfficiumException.badRequest("invalid_limit",
                    "`limit` is 1 to " + MAX_LIMIT + " and `offset` is 0 or more");
        }
        String normalizedState = state == null || state.isBlank() ? null : state.strip().toLowerCase(Locale.ROOT);
        if (normalizedState != null && !STATES.contains(normalizedState)) {
            throw OfficiumException.badRequest("invalid_doc_state",
                    "`state` is one of published, unpublished or archived");
        }
        return new DocSearchQuery(text.strip(), collection(collection), account(author), after, before,
                normalizedState, limit, offset == null ? 0 : offset);
    }

    /**
     * True when the text uses none of the operators ({@code "…"}, {@code OR}, {@code -word}): only
     * then does a page that merely contains the text as typed still count (JAVA-805: nothing today's
     * search finds is lost).
     */
    public boolean isPlain() {
        if (text.indexOf('"') >= 0) {
            return false;
        }
        for (String token : text.split("\\s+")) {
            if (token.equals("OR") || token.length() > 1 && token.charAt(0) == '-') {
                return false;
            }
        }
        return true;
    }

    private static String collection(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String path = DocPage.normalizePath(raw);
        if (path.contains("/")) {
            throw OfficiumException.badRequest("invalid_doc_path",
                    "`collection` is the path of a collection, one segment like contracts");
        }
        return path;
    }

    private static UUID account(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(raw.strip());
        } catch (IllegalArgumentException ex) {
            throw OfficiumException.badRequest("invalid_author", "`author` is an account id");
        }
    }

    private static Instant instant(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(raw.strip());
        } catch (DateTimeParseException ex) {
            throw OfficiumException.badRequest("invalid_updated_range",
                    "`updatedAfter` and `updatedBefore` are ISO-8601 instants like 2026-10-01T00:00:00Z");
        }
    }
}
