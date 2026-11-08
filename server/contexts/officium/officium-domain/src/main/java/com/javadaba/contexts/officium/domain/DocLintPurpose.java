package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * The purpose rules (JAVA-1763): a page holds one purpose, so it names its sections from the schema,
 * takes no more of them than its type allows, and stays under a length. The limits are measured on the
 * corpus (JAVA-1763, the closing comment has the distribution): the smallest multiple of 1,000
 * characters no page that follows the schema exceeds. A page follows the schema when its frontmatter
 * names a valid type; the built-in pages do, and so do the living pages that were written to it.
 */
final class DocLintPurpose {

    static final int MAX_PAGE_CHARS = 38_000;
    static final int MAX_SECTION_CHARS = 33_000;
    /** A page with no valid type is held to the widest type's allowance. */
    private static final int UNTYPED_SECTIONS = DocSections.allowed("tutorial");

    /** An H2 heading: its 0-based line in the body, and its text after the `##`. */
    record Heading(int line, String text) {
    }

    private DocLintPurpose() {
    }

    /**
     * @param lines   the body, one entry per line, CRLF already normalized
     * @param headers the H2 headings outside fences, in order
     * @param h1Line  the 0-based line of the H1, or 0 when there is none
     * @param type    the page's valid type, or {@code null}
     */
    static List<DocLint.Finding> check(String[] lines, List<Heading> headers, int h1Line, String type) {
        List<DocLint.Finding> findings = new ArrayList<>();
        int cap = type == null ? UNTYPED_SECTIONS : DocSections.allowed(type);
        for (Heading header : headers) {
            if (DocSections.find(DocSections.keyOf(header.text())) == null) {
                findings.add(new DocLint.Finding("section.unknown", header.line() + 1, "The H2 \"" + header.text()
                        + "\" is not a section of the page schema: write it as its own page under this page's path, "
                        + "and leave a lead here with a list of its children"));
            }
        }
        if (headers.size() > cap) {
            findings.add(new DocLint.Finding("section.count", h1Line + 1, "The page has " + headers.size()
                    + " H2 sections and takes at most " + cap + (type == null
                            ? " (no valid type)"
                            : " for a `" + type
                                    + "` page")
                    + ": write the sections outside the schema as their own pages under this page's path, "
                    + "and leave a lead here with a list of them"));
        }
        int pageChars = chars(lines, 0, lines.length);
        if (pageChars > MAX_PAGE_CHARS) {
            findings.add(new DocLint.Finding("page.length", h1Line + 1, "The page is " + pageChars + " characters: "
                    + MAX_PAGE_CHARS + " at most. Split it: each section that does not belong to the page moves to its "
                    + "own page under this page's path, and this one keeps a lead and a list of links"));
        }
        for (int k = 0; k < headers.size(); k++) {
            Heading header = headers.get(k);
            int end = k + 1 < headers.size() ? headers.get(k + 1).line() : lines.length;
            int sectionChars = chars(lines, header.line(), end);
            if (sectionChars > MAX_SECTION_CHARS) {
                findings.add(new DocLint.Finding("section.length", header.line() + 1, "The section \"" + header.text()
                        + "\" is " + sectionChars + " characters: " + MAX_SECTION_CHARS
                        + " at most. Move it to its own "
                        + "page under this page's path, and link it from here"));
            }
        }
        return findings;
    }

    /** The characters of {@code lines[from, to)}, joined with a newline, counted as code points. */
    private static int chars(String[] lines, int from, int to) {
        String text = String.join("\n", Arrays.copyOfRange(lines, from, to));
        return text.codePointCount(0, text.length());
    }
}
