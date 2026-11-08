package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * A file or an image a documentation page carries (JAVA-798, ADR 0023): its bytes live in the
 * database, next to the page, and the page's Markdown reaches it as {@code
 * doc://<page>/_files/<name>}. A row is immutable: replacing a file is deleting its name and
 * uploading it again. {@code originalBytes} is what was sent, {@code storedBytes} what is kept and
 * what the allowance counts; {@code width}/{@code height} are 0 for a file.
 */
public record DocAttachment(UUID id, UUID projectId, UUID pageId, String name, Kind kind, String contentType,
        long originalBytes, long storedBytes, int width, int height, String sha256, Actor createdBy,
        Instant createdAt) {

    public enum Kind {
        IMAGE, FILE
    }

    public static final int MAX_NAME_LENGTH = 100;

    private static final Pattern NAME = Pattern.compile("[a-z0-9][a-z0-9.-]*");

    public DocAttachment {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(pageId, "pageId");
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(kind, "kind");
    }

    /** {@code true} for a name the server accepts as is: it never renames. */
    public static boolean validName(String name) {
        return name != null && name.length() <= MAX_NAME_LENGTH && NAME.matcher(name).matches()
                && !name.contains("..");
    }

    public static String requireName(String name) {
        if (!validName(name)) {
            throw OfficiumException.badRequest("attachment_name_invalid", "A file name is lower-case letters, digits, "
                    + "dots and hyphens, starts with a letter or a digit, and has at most " + MAX_NAME_LENGTH
                    + " characters");
        }
        return name;
    }
}
