package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * The layout of one documentation path (JAVA-791, contract §8.17): its icon, colour, how it orders its
 * children and where it sits among its siblings. Rows are sparse: a path has one only when it is a
 * collection (depth 1) or somebody styled or reordered it, everything else is derived from the pages.
 *
 * <p>{@code position} is {@code null} until the node is placed; {@code version} 0 means "no row yet".
 */
public record DocNode(UUID projectId, String path, String icon, String iconColor, DocSortMode sortMode,
        Integer position, int version, Instant updatedAt, boolean fullWidth, UUID id) {

    public static final int MAX_ICON_LENGTH = 40;
    public static final String COLLECTION_ICON = "folder";
    public static final String COLLECTION_COLOR = "slate";

    private static final Pattern ICON_ID = Pattern.compile("[a-z0-9]+(?:-[a-z0-9]+)*");

    /**
     * A row built without an identity: the store gives it one when it inserts it. A collection star holds
     * this id (JAVA-799), so a move or a layout change, which only ever rewrite the row, keep every star.
     */
    public DocNode(UUID projectId, String path, String icon, String iconColor, DocSortMode sortMode,
            Integer position, int version, Instant updatedAt, boolean fullWidth) {
        this(projectId, path, icon, iconColor, sortMode, position, version, updatedAt, fullWidth, null);
    }

    /** A fresh collection: the default a seed gives every first segment. */
    public static DocNode collection(UUID projectId, String path, Integer position, Instant now) {
        return new DocNode(projectId, path, COLLECTION_ICON, COLLECTION_COLOR, DocSortMode.MANUAL, position, 1, now,
                false, UUID.randomUUID());
    }

    public static int depth(String path) {
        return (int) path.chars().filter(c -> c == '/').count() + 1;
    }

    /**
     * The node after a change: {@code null} keeps a field, an empty icon or colour clears it back to the
     * default. Validation is here so the REST and MCP adapters can't disagree on it.
     */
    public DocNode changed(String newIcon, String newIconColor, DocSortMode newSortMode, Integer newPosition,
            Instant now) {
        return changed(newIcon, newIconColor, newSortMode, newPosition, null, now);
    }

    /** As above; {@code newFullWidth} {@code null} keeps the page's width setting (JAVA-795). */
    public DocNode changed(String newIcon, String newIconColor, DocSortMode newSortMode, Integer newPosition,
            Boolean newFullWidth, Instant now) {
        String icon = newIcon == null ? this.icon : (newIcon.isEmpty() ? null : requireIcon(newIcon));
        String color = newIconColor == null
                ? this.iconColor
                : (newIconColor.isEmpty() ? null : requireColor(newIconColor));
        return new DocNode(projectId, path, icon, color, newSortMode == null ? sortMode : newSortMode,
                newPosition == null ? position : newPosition, version + 1, now,
                newFullWidth == null ? fullWidth : newFullWidth, id);
    }

    public DocNode withVersion(int newVersion) {
        return new DocNode(projectId, path, icon, iconColor, sortMode, position, newVersion, updatedAt, fullWidth, id);
    }

    public DocNode withId(UUID newId) {
        return new DocNode(projectId, path, icon, iconColor, sortMode, position, version, updatedAt, fullWidth, newId);
    }

    public DocNode withPosition(int newPosition, Instant now) {
        return new DocNode(projectId, path, icon, iconColor, sortMode, newPosition, version + 1, now, fullWidth, id);
    }

    /** A lucide id (the app's own list decides which it draws) or exactly one emoji. */
    public static String requireIcon(String value) {
        if (value.length() <= MAX_ICON_LENGTH && ICON_ID.matcher(value).matches()) {
            return value;
        }
        if (SingleEmoji.is(value)) {
            return value;
        }
        throw OfficiumException.badRequest("invalid_doc_icon",
                "An icon is an icon name like \"book-open\" or exactly one emoji");
    }

    public static String requireColor(String value) {
        try {
            return ProjectColor.fromWire(value).wire();
        } catch (IllegalArgumentException e) {
            throw OfficiumException.badRequest("invalid_doc_color",
                    "\"" + value + "\" is not one of the palette's colors");
        }
    }
}
