package com.javadaba.contexts.officium.domain;

import java.util.regex.Pattern;

/**
 * What a bulk import refuses on top of a page's own rules (JAVA-778, contract §8.13). A page is
 * Markdown whose images are attachments (§8.7), uploaded to the page: an image that is not one would arrive
 * as a dead link, and refusing it says so at the import, page by page, instead of the reader finding out later.
 *
 * <p>An image written as code is text, not an image: a contract that SHOWS the markup
 * ({@code `<img>`}, or an HTML sample in a fenced block) is legitimate, so fenced blocks and inline
 * code are left out before looking.
 */
public final class DocImport {

    /** Pages per batch: a request stays a few hundred kilobytes, and a retry costs little. */
    public static final int MAX_PAGES_PER_BATCH = 50;

    private static final Pattern FENCED = Pattern.compile("(?ms)^\\s*(```|~~~).*?^\\s*\\1[^\\n]*$");
    private static final Pattern INLINE_CODE = Pattern.compile("(`+)[^`\\n]*?\\1");
    private static final Pattern IMAGE = Pattern.compile(
            "!\\[[^\\]\\n]*]\\s*(?:\\((?!doc://[^)\\s]*/_files/)|\\[)|<img\\b", Pattern.CASE_INSENSITIVE);

    private DocImport() {
    }

    public static boolean containsImage(String body) {
        if (body == null || body.isEmpty()) {
            return false;
        }
        String prose = INLINE_CODE.matcher(FENCED.matcher(body).replaceAll("")).replaceAll("");
        return IMAGE.matcher(prose).find();
    }
}
