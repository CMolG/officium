package com.javadaba.contexts.officium.domain;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A template's two rules (JAVA-801, design §6): where it lives, which its path says, and what a page
 * made from it reads, its variables filled. The web's {@code lib/docs/doc-template.ts} mirrors the same
 * cases, so the title it previews is the title the server writes.
 */
public final class DocTemplate {

    private static final Pattern VARIABLE = Pattern.compile("\\{(datetime|date|time|author)}");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private DocTemplate() {
    }

    /** The collection a template at {@code path} belongs to: its first segment, or {@code null} (the project's). */
    public static String collectionOf(String path) {
        int slash = path.indexOf('/');
        return slash < 0 ? null : path.substring(0, slash);
    }

    /** The caller's time zone: none is UTC, and one {@link ZoneId} can't read is refused rather than guessed. */
    public static ZoneId zone(String timeZone) {
        if (timeZone == null || timeZone.isBlank()) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(timeZone.strip());
        } catch (DateTimeException ex) {
            throw OfficiumException.badRequest("invalid_time_zone", "\"" + timeZone
                    + "\" is not a time zone: use an IANA name like Europe/Madrid, or leave it out for UTC");
        }
    }

    /**
     * {@code text} with {@code {date}} ({@code 2026-10-13}), {@code {time}} ({@code 15:42}),
     * {@code {datetime}} ({@code 2026-10-13 15:42}) and {@code {author}} filled, ISO like every date the
     * page schema writes. Any other {@code {…}} stays as written, and nothing filled is filled again.
     */
    public static String fill(String text, ZonedDateTime at, String author) {
        Matcher matcher = VARIABLE.matcher(text);
        return matcher.replaceAll(match -> Matcher.quoteReplacement(switch (match.group(1)) {
            case "date" -> DATE.format(at);
            case "time" -> TIME.format(at);
            case "datetime" -> DATE.format(at) + " " + TIME.format(at);
            default -> author;
        }));
    }
}
