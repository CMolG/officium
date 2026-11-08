package com.javadaba.contexts.officium.domain.jql;

import java.util.Locale;
import java.util.Set;

/** The Java twin of {@code jql.ts}'s {@code KEYWORDS} -- reserved words that can never be typed
 *  where a field name is expected. */
final class JqlKeywords {

    private static final Set<String> KEYWORDS = Set.of(
            "and", "or", "not", "in", "is", "empty", "null", "order", "by", "asc", "desc");

    private JqlKeywords() {
    }

    static boolean isKeyword(String raw) {
        return KEYWORDS.contains(raw.toLowerCase(Locale.ROOT));
    }
}
