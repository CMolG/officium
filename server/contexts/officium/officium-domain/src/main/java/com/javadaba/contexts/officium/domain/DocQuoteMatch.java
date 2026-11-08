package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Where a {@link DocQuote} stands in a page's Markdown (JAVA-797). The web matches on the editor's text and
 * the server on the stored Markdown; they differ by markup and by what the editor holds outside its text (list
 * numbers, a fence's language), so both compare WORDS: runs of letters and
 * digits, case-sensitive, in order and next to each other. The first and last word of the quote may be the
 * tail and the head of longer words. {@code comment-quote.ts} in {@code @javadaba/rich-text} follows the same
 * rule, and one case table pins both.
 */
public final class DocQuoteMatch {

    /** How much text on each side is compared with the prefix and suffix: bounded, so scoring costs the same on a huge page. */
    private static final int NEIGHBOURS = 512;
    private static final Pattern WORD = Pattern.compile("[\\p{L}\\p{N}]+");
    private static final Pattern FRONTMATTER = Pattern.compile("\\A---\\R.*?\\R---[ \\t]*(?:\\R|\\z)", Pattern.DOTALL);
    private static final Pattern IMAGE = Pattern.compile("!\\[[^\\]]*\\]\\([^)]*\\)");
    private static final Pattern LINK = Pattern.compile("\\[([^\\]]*)\\]\\([^)]*\\)");
    private static final Pattern AUTOLINK = Pattern.compile("<(https?://[^>\\s]+)>");
    private static final Pattern ORDERED = Pattern.compile("^[ \\t]*(?:>[ \\t]*)*\\d+[.)][ \\t]+", Pattern.MULTILINE);
    private static final Pattern FENCE = Pattern.compile("^[ \\t]*(?:```|~~~)\\S*", Pattern.MULTILINE);
    private static final Pattern TAG = Pattern.compile("</?[A-Za-z][^>]*>");
    private static final Pattern ENTITY = Pattern.compile("&#?[A-Za-z0-9]+;");
    private static final Pattern MARKER = Pattern.compile("\\[(?: |x|X|![A-Za-z]+)\\]");
    private static final Pattern INLINE = Pattern.compile("[*~`]");

    private DocQuoteMatch() {
    }

    /** Where the quote was found, with its surroundings filled from the page when the caller sent none. */
    public record Found(DocQuote quote, int start, int end) {
    }

    /** The page as a person reads it, minus markup: what the quote is matched against. */
    public static String text(String markdown) {
        String text = FRONTMATTER.matcher(markdown == null ? "" : markdown).replaceFirst("");
        text = FENCE.matcher(text).replaceAll("");
        text = ORDERED.matcher(text).replaceAll("");
        text = IMAGE.matcher(text).replaceAll("");
        text = LINK.matcher(text).replaceAll("$1");
        text = AUTOLINK.matcher(text).replaceAll("$1");
        text = TAG.matcher(text).replaceAll("");
        text = ENTITY.matcher(text).replaceAll("");
        text = MARKER.matcher(text).replaceAll("");
        return INLINE.matcher(text).replaceAll("");
    }

    public static List<String> wordsOf(String value) {
        List<String> words = new ArrayList<>();
        Matcher m = WORD.matcher(value);
        while (m.find()) {
            words.add(m.group());
        }
        return words;
    }

    public static boolean detached(String markdown, DocQuote quote) {
        return find(markdown, quote).isEmpty();
    }

    public static Optional<Found> find(String markdown, DocQuote quote) {
        String text = text(markdown);
        List<String> wanted = wordsOf(quote.exact());
        List<int[]> words = new ArrayList<>();
        Matcher m = WORD.matcher(text);
        while (m.find()) {
            words.add(new int[]{m.start(), m.end()});
        }
        Found best = null;
        int bestScore = -1;
        int last = wanted.size() - 1;
        for (int i = 0; i + last < words.size(); i++) {
            int start = startOf(text, words, i, wanted);
            int end = endOf(text, words, i + last, wanted);
            if (start < 0 || end < 0 || !middleMatches(text, words, i, wanted)) {
                continue;
            }
            int score = score(text, start, end, quote);
            if (score > bestScore) {
                bestScore = score;
                best = new Found(quote, start, end);
            }
        }
        if (best == null) {
            return Optional.empty();
        }
        String prefix = quote.prefix().isEmpty() ? tail(text.substring(0, best.start())) : quote.prefix();
        String suffix = quote.suffix().isEmpty() ? head(text.substring(best.end())) : quote.suffix();
        return Optional.of(new Found(new DocQuote(quote.exact(), prefix, suffix), best.start(), best.end()));
    }

    private static int startOf(String text, List<int[]> words, int i, List<String> wanted) {
        String word = text.substring(words.get(i)[0], words.get(i)[1]);
        String first = wanted.get(0);
        if (wanted.size() == 1) {
            int at = word.indexOf(first);
            return at < 0 ? -1 : words.get(i)[0] + at;
        }
        return word.endsWith(first) ? words.get(i)[1] - first.length() : -1;
    }

    private static int endOf(String text, List<int[]> words, int j, List<String> wanted) {
        String word = text.substring(words.get(j)[0], words.get(j)[1]);
        String last = wanted.get(wanted.size() - 1);
        if (wanted.size() == 1) {
            int at = word.indexOf(last);
            return at < 0 ? -1 : words.get(j)[0] + at + last.length();
        }
        return word.startsWith(last) ? words.get(j)[0] + last.length() : -1;
    }

    private static boolean middleMatches(String text, List<int[]> words, int from, List<String> wanted) {
        for (int k = 1; k < wanted.size() - 1; k++) {
            int[] w = words.get(from + k);
            if (!text.substring(w[0], w[1]).equals(wanted.get(k))) {
                return false;
            }
        }
        return true;
    }

    /** How many word characters the page shares with the quote's prefix (backwards) and suffix (forwards). */
    private static int score(String text, int start, int end, DocQuote quote) {
        return commonTail(onlyWords(text.substring(Math.max(0, start - NEIGHBOURS), start)), onlyWords(quote.prefix()))
                + commonHead(onlyWords(text.substring(end, Math.min(text.length(), end + NEIGHBOURS))),
                        onlyWords(quote.suffix()));
    }

    private static String onlyWords(String value) {
        return String.join("", wordsOf(value));
    }

    private static int commonTail(String a, String b) {
        int n = 0;
        while (n < a.length() && n < b.length() && a.charAt(a.length() - 1 - n) == b.charAt(b.length() - 1 - n)) {
            n++;
        }
        return n;
    }

    private static int commonHead(String a, String b) {
        int n = 0;
        while (n < a.length() && n < b.length() && a.charAt(n) == b.charAt(n)) {
            n++;
        }
        return n;
    }

    private static String tail(String value) {
        return value.length() <= DocQuote.MAX_CONTEXT ? value : value.substring(value.length() - DocQuote.MAX_CONTEXT);
    }

    private static String head(String value) {
        return value.length() <= DocQuote.MAX_CONTEXT ? value : value.substring(0, DocQuote.MAX_CONTEXT);
    }
}
