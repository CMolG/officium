package com.javadaba.contexts.officium.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * The case table of JAVA-797's quote rule. {@code comment-quote.test.ts} in {@code @javadaba/rich-text} holds the
 * same rows: change one and you change both.
 */
class DocQuoteMatchTest {

    @ParameterizedTest(name = "[{index}] {0}")
    @CsvSource(delimiter = '|', textBlock = """
            plain words stand               | the quick brown fox | quick brown                  | true
            case matters                    | the Quick brown fox | quick brown                  | false
            order matters                   | the quick brown fox | brown quick                  | false
            contiguous only                 | the quick brown fox | the brown                    | false
            markup between words is ignored | the **quick** brown fox | quick brown              | true
            link target is not text         | see [the guide](https://x.dev/guide) now | the guide now | true
            image syntax is not text        | a ![alt](doc://p/_files/a.png) b | alt                | false
            html tags and entities          | a <kbd>Ctrl</kbd> &amp; c | a Ctrl c                  | true
            task and notice markers         | - [x] ship it\\n> [!NOTE]\\n> read | ship it read      | true
            frontmatter is not text         | ---\\ntitle: Secret\\n---\\nBody here | Secret      | false
            first word may be a tail        | the unbelievable fox | believable fox              | true
            last word may be a head         | the quick brownish fox | quick brown               | true
            a single word inside a word     | the unbelievable fox | believ                      | true
            punctuation is not a word       | end. Start here | end Start                        | true
            ordered list markers are not text | 1. first item\\n2. second item | first item second item | true
            a fence language is not text  | ```ts\\nconst a = 1;\\n``` | const a | true
            an autolink shows its address   | see <https://x.dev> now | see https x dev now | true
            words gone                      | the quick fox | quick brown                          | false
            """)
    void anchorsWhereItsWordsStand(String name, String body, String exact, boolean anchored) {
        String markdown = body.replace("\\n", "\n");
        assertEquals(anchored, DocQuoteMatch.find(markdown, DocQuote.of(exact)).isPresent());
        assertEquals(!anchored, DocQuoteMatch.detached(markdown, DocQuote.of(exact)));
    }

    @Test
    void ofSeveralPlacesTheNeighboursDecideThenTheFirstWins() {
        String body = "red cat sat. blue cat ran. green cat hid.";
        var found = DocQuoteMatch.find(body, new DocQuote("cat", "blue", "ran")).orElseThrow();
        assertEquals(body.indexOf("cat", 12), found.start());
        var first = DocQuoteMatch.find(body, DocQuote.of("cat")).orElseThrow();
        assertEquals(body.indexOf("cat"), first.start());
    }

    @Test
    void aMissingPrefixAndSuffixAreFilledFromTheMatch() {
        var found = DocQuoteMatch.find("alpha beta gamma delta", DocQuote.of("beta gamma")).orElseThrow();
        assertEquals("alpha ", found.quote().prefix());
        assertEquals(" delta", found.quote().suffix());
    }

    @Test
    void aQuoteNeedsAWordAndStaysShort() {
        assertThrows(OfficiumException.class, () -> DocQuote.of("  ... "));
        assertThrows(OfficiumException.class, () -> DocQuote.of("a".repeat(DocQuote.MAX_EXACT + 1)));
        var long64 = new DocQuote("word", "p".repeat(100), "s".repeat(100));
        assertEquals(DocQuote.MAX_CONTEXT, long64.prefix().length());
        assertEquals(DocQuote.MAX_CONTEXT, long64.suffix().length());
    }

    @Test
    void oneEmojiIsOneGrapheme() {
        assertTrue(SingleEmoji.is("👍"));
        assertTrue(SingleEmoji.is("👨‍👩‍👧"));
        assertFalse(SingleEmoji.is("👍👍"));
        assertFalse(SingleEmoji.is("a"));
        assertFalse(SingleEmoji.is(""));
    }
}
