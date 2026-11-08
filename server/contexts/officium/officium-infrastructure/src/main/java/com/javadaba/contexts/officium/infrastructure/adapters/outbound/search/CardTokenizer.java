package com.javadaba.contexts.officium.infrastructure.adapters.outbound.search;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Whitespace/lowercase tokenizer for {@link RoaringBitmapSearchAdapter}'s inverted index
 * (2026-09-19 backend comparison, promoted to production 2026-09-20 --
 * {@code doc://history/plans/2026-09-19-officium-busqueda-backends-benchmark}). Deliberately simple:
 * no stemming or stop-words, same tokenization on index and query so exact-token AND matches what a
 * user typed.
 */
final class CardTokenizer {

    private CardTokenizer() {
    }

    /** Every distinct lowercase token across all of {@code texts} (nulls skipped). */
    static Set<String> tokenize(String... texts) {
        Set<String> tokens = new LinkedHashSet<>();
        for (String text : texts) {
            for (String token : splitWords(text)) {
                tokens.add(token);
            }
        }
        return tokens;
    }

    /** The query's own terms, in order -- used to AND token bitmaps together / build an FT.SEARCH
     *  clause. */
    static List<String> queryTerms(String text) {
        return List.copyOf(splitWordsOrdered(text));
    }

    private static Set<String> splitWords(String text) {
        return splitWordsOrdered(text);
    }

    private static Set<String> splitWordsOrdered(String text) {
        Set<String> words = new LinkedHashSet<>();
        if (text == null || text.isBlank()) {
            return words;
        }
        for (String word : text.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")) {
            if (!word.isBlank()) {
                words.add(word);
            }
        }
        return words;
    }
}
