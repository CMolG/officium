package com.javadaba.contexts.officium.domain;

import java.util.Set;

/**
 * The content types Officium stores as a file, on a card or on a documentation page (JAVA-798).
 * SVG is not here on purpose: it is code, and a page serving it inline would run it.
 */
public final class AttachmentContentTypes {

    public static final Set<String> ALLOWED = Set.of(
            "image/png", "image/jpeg", "image/gif", "image/webp",
            "application/pdf", "text/plain", "text/markdown", "text/csv",
            "application/json", "application/zip",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private AttachmentContentTypes() {
    }
}
