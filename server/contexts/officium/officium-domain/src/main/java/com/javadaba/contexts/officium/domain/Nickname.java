package com.javadaba.contexts.officium.domain;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * What a person is called inside one Officium organization (JAVA-199). It is Officium's own: the
 * rest of Javadaba never sees it. Unique inside its organization regardless of case, so "Carlos97"
 * and "carlos97" can't be two people on the same board.
 */
public record Nickname(String value) {

    public static final int MIN_LENGTH = 2;
    public static final int MAX_LENGTH = 32;
    private static final Pattern ALLOWED = Pattern.compile("[\\p{L}\\p{N}._-]+");

    public Nickname {
        value = value == null ? "" : value.strip();
        if (value.length() < MIN_LENGTH || value.length() > MAX_LENGTH || !ALLOWED.matcher(value).matches()) {
            throw OfficiumException.badRequest("nickname_invalid", "A nickname is " + MIN_LENGTH + " to "
                    + MAX_LENGTH + " letters, digits, dots, underscores or hyphens, with no spaces");
        }
    }

    /** The form uniqueness is decided on. */
    public String key() {
        return value.toLowerCase(Locale.ROOT);
    }

    /**
     * An agent as the board shows it (JAVA-199): the client's product name and whose it is --
     * "Claude Code (carlos97)". Claude Code registers itself as "Claude Code (&lt;server&gt;)", and the
     * server's name says nothing on a board that is that server, so that suffix goes.
     */
    public static String agentLabel(String clientName, String owner) {
        String product = clientName == null ? "" : clientName.strip();
        int suffix = product.endsWith(")") ? product.lastIndexOf(" (") : -1;
        if (suffix > 0) {
            product = product.substring(0, suffix);
        }
        if (product.isBlank()) {
            product = "Agent";
        }
        return owner == null || owner.isBlank() ? product : product + " (" + owner + ")";
    }
}
