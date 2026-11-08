package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.regex.Pattern;

/**
 * A person's work profile (card://JAVA-1524): a named distribution of roles, models and efforts over the role
 * matrix's cells, kept as an overlay on Officium's defaults, the same shape as a project's own overrides. A
 * project's owner activates one of theirs, and the project's matrix becomes defaults, then the profile, then the
 * project's own cells. {@code builtin} profiles (Claude Standard, Claude Eco) exist for every account; editing one
 * keeps that account's copy, at {@code version} 1 and up, and a built-in nobody edited is at version 0.
 */
public record WorkProfile(String id, String name, boolean builtin, RoleMatrix overrides, int version,
        Instant updatedAt) {

    private static final Pattern ID = Pattern.compile("[a-z0-9][a-z0-9-]{0,63}");
    public static final int NAME_MAX = 80;

    /** A profile id is kebab-case, at most 64 characters; refused with {@code invalid_profile_id} otherwise. */
    public static String requireId(String id) {
        if (id == null || !ID.matcher(id).matches()) {
            throw OfficiumException.badRequest("invalid_profile_id",
                    "A profile id is lowercase letters, digits and hyphens, at most 64 characters");
        }
        return id;
    }

    /** A profile name is 1 to 80 characters, trimmed; refused with {@code invalid_profile_name} otherwise. */
    public static String requireName(String name) {
        String trimmed = name == null ? "" : name.strip();
        if (trimmed.isEmpty() || trimmed.length() > NAME_MAX) {
            throw OfficiumException.badRequest("invalid_profile_name",
                    "A profile's name is 1 to " + NAME_MAX + " characters");
        }
        return trimmed;
    }

    /** The full matrix this profile gives a project with no cells of its own. */
    public RoleMatrix matrix() {
        return RoleMatrix.defaults().overlay(overrides);
    }
}
