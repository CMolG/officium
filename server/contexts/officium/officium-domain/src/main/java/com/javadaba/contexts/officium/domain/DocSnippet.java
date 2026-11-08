package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * The excerpt of a search result as parts, never HTML: a page body can hold {@code <script>}, so the
 * client draws {@code match} parts itself. The database marks a match with U+E000 and U+E001
 * (private-use code points a page does not carry); a result that only contains the text gets a window
 * around its first occurrence.
 */
public final class DocSnippet {

    public static final char START = '';
    public static final char STOP = '';

    /** One run of the excerpt; {@code match} is true where the search text hit. */
    public record Part(String text, boolean match) {
    }

    private DocSnippet() {
    }

    /** Splits a text the database marked with {@link #START} and {@link #STOP}. */
    public static List<Part> fromMarked(String marked) {
        List<Part> parts = new ArrayList<>();
        if (marked == null || marked.isBlank()) {
            return parts;
        }
        int at = 0;
        while (at < marked.length()) {
            int start = marked.indexOf(START, at);
            if (start < 0) {
                add(parts, marked.substring(at), false);
                break;
            }
            add(parts, marked.substring(at, start), false);
            int stop = marked.indexOf(STOP, start + 1);
            if (stop < 0) {
                add(parts, marked.substring(start + 1), true);
                break;
            }
            add(parts, marked.substring(start + 1, stop), true);
            at = stop + 1;
        }
        return parts;
    }

    /** Marks the first occurrence of {@code needle} (ignoring case) in an excerpt that carries no marks. */
    public static List<Part> window(String excerpt, String needle) {
        List<Part> parts = new ArrayList<>();
        if (excerpt == null || excerpt.isBlank()) {
            return parts;
        }
        int at = excerpt.toLowerCase(Locale.ROOT).indexOf(needle.toLowerCase(Locale.ROOT));
        if (at < 0 || at + needle.length() > excerpt.length()) {
            add(parts, excerpt, false);
            return parts;
        }
        add(parts, excerpt.substring(0, at), false);
        add(parts, excerpt.substring(at, at + needle.length()), true);
        add(parts, excerpt.substring(at + needle.length()), false);
        return parts;
    }

    private static void add(List<Part> parts, String text, boolean match) {
        if (!text.isEmpty()) {
            parts.add(new Part(text, match));
        }
    }
}
