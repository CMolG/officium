package com.javadaba.contexts.officium.domain;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The page schema's rules for images (JAVA-798): an image is one of the page's own files, and it says what
 * it shows. A source that is not {@code doc://<page>/_files/<name>} is never drawn (a page loads nothing
 * from anywhere else), so the lint says so while the page is written, not when a reader meets a placeholder.
 */
final class DocLintImages {

    private static final Pattern IMAGE = Pattern.compile("!\\[([^\\]\\n]*)]\\(\\s*<?([^)\\s>]*)");
    private static final Pattern FILE = Pattern
            .compile("doc://(?:[a-z0-9]+(?:-[a-z0-9]+)*/)*[a-z0-9]+(?:-[a-z0-9]+)*/_files/[a-z0-9][a-z0-9.-]*");

    /** Where a finding goes: its rule, the line of the body, and its words. */
    interface Report {
        void add(String rule, int line, String message);
    }

    private DocLintImages() {
    }

    /** Reports what is wrong with the images in {@code text} (a line with its inline code already taken out) and gives it back. */
    static String checked(String text, int line, Report report) {
        Matcher image = IMAGE.matcher(text);
        while (image.find()) {
            if (!FILE.matcher(image.group(2)).matches()) {
                report.add("image.source", line, "An image whose source is \"" + image.group(2) + "\" is never drawn: "
                        + "upload the file to the page and use its `doc://…/_files/<name>` address");
            }
            if (image.group(1).isBlank()) {
                report.add("image.alt-missing", line, "An image with no alt text: write the caption, it is also what a "
                        + "reader who cannot see the image hears");
            }
        }
        return text;
    }
}
