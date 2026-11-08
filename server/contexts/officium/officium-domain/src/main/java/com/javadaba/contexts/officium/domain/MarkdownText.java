package com.javadaba.contexts.officium.domain;

import java.util.regex.Pattern;

/**
 * The text a reader sees in a card's Markdown, for the places that show it as one plain line: the
 * board's card face and the {@code excerpt} agents read over MCP. Before this, the excerpt was the
 * raw source with its whitespace collapsed, so the board showed {@code ## Why this needs you **Needs
 * console access**} (user report, 2026-09-23).
 *
 * <p>Deliberately a stripper, not a parser: it only has to remove syntax from one line of preview,
 * and a real parser here would be a dependency for 160 characters.
 */
final class MarkdownText {

    private static final Pattern FENCE = Pattern.compile("^\\s*(```|~~~).*$", Pattern.MULTILINE);
    private static final Pattern TABLE_RULE = Pattern.compile(
            "^\\s*\\|?\\s*:?-{3,}:?\\s*(\\|\\s*:?-{3,}:?\\s*)*\\|?\\s*$",
            Pattern.MULTILINE);
    private static final Pattern BLOCK_MARKERS = Pattern.compile(
            "^\\s*(?:#{1,6}\\s+|>\\s?|(?:[-+*]|\\d+[.)])\\s+(?:\\[[ xX~-]]\\s+)?)", Pattern.MULTILINE);
    private static final Pattern IMAGE = Pattern.compile("!\\[([^\\]]*)]\\([^)]*\\)");
    private static final Pattern LINK = Pattern.compile("\\[([^\\]]+)]\\([^)]*\\)");
    private static final Pattern AUTOLINK = Pattern.compile("<((?:https?|mailto):[^>\\s]+)>");
    private static final Pattern CODE = Pattern.compile("`+([^`]+)`+");
    private static final Pattern STRONG = Pattern.compile("(\\*\\*|__|~~)(.+?)\\1");
    private static final Pattern EMPHASIS = Pattern.compile("(?<![\\w*])([*_])(?=\\S)(.+?)(?<=\\S)\\1(?![\\w*])");
    private static final Pattern ESCAPE = Pattern.compile("\\\\([\\\\`*_{}\\[\\]()#+\\-.!|~<>])");
    /** Start of a Private Use Area block: where an escaped ASCII character waits out the stripping. */
    private static final char PARKED = '';

    private MarkdownText() {
    }

    static String plain(String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return "";
        }
        // An escaped character is text, not syntax: parked out of every pattern's reach first.
        String text = ESCAPE.matcher(markdown).replaceAll(m -> String.valueOf((char) (PARKED + m.group(1).charAt(0))));
        text = FENCE.matcher(text).replaceAll("");
        text = TABLE_RULE.matcher(text).replaceAll("");
        text = BLOCK_MARKERS.matcher(text).replaceAll("");
        text = text.replace('|', ' ');
        text = IMAGE.matcher(text).replaceAll("$1");
        text = LINK.matcher(text).replaceAll("$1");
        text = AUTOLINK.matcher(text).replaceAll("$1");
        text = CODE.matcher(text).replaceAll("$1");
        // Twice: `***bold italic***` is one strong inside one emphasis.
        for (int pass = 0; pass < 2; pass++) {
            text = STRONG.matcher(text).replaceAll("$2");
            text = EMPHASIS.matcher(text).replaceAll("$2");
        }
        StringBuilder unparked = new StringBuilder(text.length());
        for (char c : text.toCharArray()) {
            unparked.append(c >= PARKED && c < PARKED + 0x80 ? (char) (c - PARKED) : c);
        }
        return unparked.toString().strip().replaceAll("\\s+", " ");
    }

    /** At most {@code limit} characters of {@link #plain}, cut at a word when there is one. */
    static String excerpt(String markdown, int limit) {
        String plain = plain(markdown);
        if (plain.length() <= limit) {
            return plain;
        }
        int cut = plain.lastIndexOf(' ', limit);
        return (cut > limit / 2 ? plain.substring(0, cut) : plain.substring(0, limit)).stripTrailing() + "…";
    }
}
