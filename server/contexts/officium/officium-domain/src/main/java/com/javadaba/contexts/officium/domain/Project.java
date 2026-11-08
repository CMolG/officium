package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * One backlog. {@code keyPrefix} is the human-readable card key prefix ({@code "OFF"} ->
 * {@code "OFF-12"}), unique per owner. The caller-relative {@code role} is NOT part of this
 * record -- it depends on who's asking, so it's computed by the service and carried on the
 * application layer's {@code ProjectView} instead. {@code icon}/{@code iconColor} are how the owner
 * tells their projects apart in the sidebar (JAVA-51). {@code formLanguages} are the languages every
 * human card's form is written in, the default first; empty = no requirement (JAVA-1082). {@code definitionOfDone}
 * is the standing checklist every agent's finishing comment answers, item by item; empty = no checklist (JAVA-1446).
 * {@code isProtected} (wire name {@code protected}) marks a project that is never deleted and never changes owner;
 * only a Liquibase changeset sets it, so nothing in this codebase builds a project with it on (JAVA-1853).
 */
public record Project(UUID id, UUID ownerAccountId, UUID folderId, String name, String keyPrefix,
        String icon, ProjectColor iconColor, Instant archivedAt, int version, Instant createdAt,
        Instant updatedAt, List<String> formLanguages, List<String> definitionOfDone, boolean isProtected) {

    public static final String DEFAULT_ICON = "folder-kanban";

    private static final java.util.regex.Pattern ICON = java.util.regex.Pattern.compile("^[a-z0-9-]{1,40}$");

    public Project {
        icon = icon == null ? DEFAULT_ICON : icon;
        iconColor = iconColor == null ? ProjectColor.SLATE : iconColor;
        formLanguages = formLanguages == null ? List.of() : List.copyOf(formLanguages);
        definitionOfDone = definitionOfDone == null ? List.of() : List.copyOf(definitionOfDone);
    }

    /** The shape every caller used before JAVA-1853: not protected. */
    public Project(UUID id, UUID ownerAccountId, UUID folderId, String name, String keyPrefix, String icon,
            ProjectColor iconColor, Instant archivedAt, int version, Instant createdAt, Instant updatedAt,
            List<String> formLanguages, List<String> definitionOfDone) {
        this(id, ownerAccountId, folderId, name, keyPrefix, icon, iconColor, archivedAt, version, createdAt,
                updatedAt, formLanguages, definitionOfDone, false);
    }

    /** The shape every caller used before JAVA-1446: no standing Definition of Done. */
    public Project(UUID id, UUID ownerAccountId, UUID folderId, String name, String keyPrefix, String icon,
            ProjectColor iconColor, Instant archivedAt, int version, Instant createdAt, Instant updatedAt,
            List<String> formLanguages) {
        this(id, ownerAccountId, folderId, name, keyPrefix, icon, iconColor, archivedAt, version, createdAt,
                updatedAt, formLanguages, List.of());
    }

    /** The shape every caller used before JAVA-1082: no form languages required. */
    public Project(UUID id, UUID ownerAccountId, UUID folderId, String name, String keyPrefix, String icon,
            ProjectColor iconColor, Instant archivedAt, int version, Instant createdAt, Instant updatedAt) {
        this(id, ownerAccountId, folderId, name, keyPrefix, icon, iconColor, archivedAt, version, createdAt,
                updatedAt, List.of());
    }

    public boolean archived() {
        return archivedAt != null;
    }

    /** A lucide icon name: lower-case words joined by dashes. Which ones exist is the app's list. */
    public static boolean isValidIcon(String icon) {
        return icon != null && ICON.matcher(icon).matches();
    }
}
