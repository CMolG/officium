package com.javadaba.contexts.officium.domain;

import java.util.regex.Pattern;

/**
 * The label of one Officium organization, shown as the Organization page's heading (JAVA-1780).
 * It is Officium's own, like a nickname: the account name in {@code iam} is the person's, and
 * renaming it would rename the person everywhere. Not unique: the organization is its owner's account.
 */
public record OrganizationName(String value) {

    public static final int MIN_LENGTH = 2;
    public static final int MAX_LENGTH = 60;
    public static final int DEFAULT_SOURCE_MAX = 40;
    public static final String FALLBACK = "My organization";
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    private static final Pattern CONTROL = Pattern.compile("\\p{Cntrl}");

    public OrganizationName {
        value = value == null ? "" : WHITESPACE.matcher(value.strip()).replaceAll(" ");
        if (value.length() < MIN_LENGTH || value.length() > MAX_LENGTH || CONTROL.matcher(value).find()) {
            throw OfficiumException.badRequest("organization_name_invalid",
                    "An organization name is " + MIN_LENGTH + " to " + MAX_LENGTH + " characters");
        }
    }

    /**
     * The name an organization has before its owner renames it: {@code <owner name>'s organization}.
     * The owner's name is the directory name, or its email's local part when it contains an {@code @}.
     */
    public static String defaultFor(String ownerName) {
        String source = ownerName == null ? "" : ownerName.strip();
        if (source.contains("@")) {
            source = source.substring(0, source.indexOf('@'));
        }
        if (source.isBlank()) {
            return FALLBACK;
        }
        if (source.length() > DEFAULT_SOURCE_MAX) {
            source = source.substring(0, DEFAULT_SOURCE_MAX);
        }
        return source.strip() + "'s organization";
    }
}
