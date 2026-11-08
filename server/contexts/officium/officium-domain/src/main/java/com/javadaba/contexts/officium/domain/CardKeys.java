package com.javadaba.contexts.officium.domain;

import java.util.regex.Pattern;

/** Formats and validates the human-readable card key ({@code "OFF-12"}, contract §2). Every card
 *  of a project shares the project's key sequence regardless of {@link Executor}. */
public final class CardKeys {

    /** Contract §3: {@code ^[A-Z][A-Z0-9]{1,9}$}. */
    public static final Pattern KEY_PREFIX = Pattern.compile("^[A-Z][A-Z0-9]{1,9}$");

    private CardKeys() {
    }

    public static String format(String keyPrefix, int number) {
        return keyPrefix + "-" + number;
    }

    public static boolean isValidPrefix(String keyPrefix) {
        return keyPrefix != null && KEY_PREFIX.matcher(keyPrefix).matches();
    }

    /** A {@code keyOrId} path segment looks like a key when it isn't a bare UUID -- used to route
     *  {@code GET .../cards/{keyOrId}} without a network round trip to find out. */
    public static boolean looksLikeKey(String keyOrId) {
        return keyOrId != null && keyOrId.indexOf('-') >= 0 && !isUuid(keyOrId);
    }

    private static boolean isUuid(String value) {
        try {
            java.util.UUID.fromString(value);
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
