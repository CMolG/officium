package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * One change that reached main, and what the documentation did about it (JAVA-132, contract §8.8).
 * The drift control is that nothing leaves {@link DocsStatus#PENDING} by itself: someone has to
 * read the change and say either that no page needed it or which pages were updated.
 *
 * <p>{@code ref} is the change's identity inside the project (a commit sha, usually), so the pipeline
 * that records it can retry without creating a second entry.
 */
public record ChangelogEntry(UUID id, UUID projectId, String ref, String title, String url, List<String> areas,
        Instant mergedAt, DocsStatus status, List<String> pages, Actor recordedBy, Instant recordedAt,
        Actor markedBy, Instant markedAt, int version) {

    public static final int MAX_REF_LENGTH = 100;
    public static final int MAX_TITLE_LENGTH = 300;
    public static final int MAX_URL_LENGTH = 500;
    public static final int MAX_AREAS = 30;
    public static final int MAX_AREA_LENGTH = 100;
    public static final int MAX_PAGES = 20;

    public ChangelogEntry {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(projectId, "projectId");
        Objects.requireNonNull(ref, "ref");
        Objects.requireNonNull(title, "title");
        Objects.requireNonNull(mergedAt, "mergedAt");
        Objects.requireNonNull(status, "status");
        Objects.requireNonNull(recordedBy, "recordedBy");
        areas = List.copyOf(areas);
        pages = List.copyOf(pages);
    }

    /**
     * A change as a pipeline or a person reports it. A commit message's title is its first line, and a
     * title too long is cut rather than refused, so a verbose commit never loses its entry.
     */
    public static ChangelogEntry recorded(UUID projectId, String ref, String title, String url, List<String> areas,
            Instant mergedAt, Actor actor, Instant now) {
        return new ChangelogEntry(UUID.randomUUID(), projectId, requireRef(ref), requireTitle(title), url(url),
                areas(areas), mergedAt == null ? now : mergedAt, DocsStatus.PENDING, List.of(), actor, now, null,
                null, 1);
    }

    /**
     * The docs' answer to this change. {@code updated} names the pages it touched; {@code reviewed}
     * names none; going back to {@code pending} forgets who had marked it.
     */
    public ChangelogEntry marked(DocsStatus newStatus, List<String> newPages, Actor actor, Instant now) {
        Objects.requireNonNull(newStatus, "status");
        List<String> normalized = pages(newPages);
        if (newStatus == DocsStatus.UPDATED && normalized.isEmpty()) {
            throw OfficiumException.badRequest("pages_required",
                    "Say which pages were updated for this change, like procedures/deploy");
        }
        if (newStatus != DocsStatus.UPDATED && !normalized.isEmpty()) {
            throw OfficiumException.badRequest("pages_not_allowed",
                    "Only an updated change names pages: mark it updated, or leave the pages out");
        }
        boolean pending = newStatus == DocsStatus.PENDING;
        return new ChangelogEntry(id, projectId, ref, title, url, areas, mergedAt, newStatus, normalized, recordedBy,
                recordedAt, pending ? null : actor, pending ? null : now, version + 1);
    }

    public boolean sameMarkAs(ChangelogEntry other) {
        return status == other.status && pages.equals(other.pages);
    }

    /** What the entry spends of the owner's allowance, in the measure {@link StorageUsage} uses. */
    public long bytes() {
        return StorageUsage.bytesOf(ref, title, url) + StorageUsage.bytesOf(areas) + StorageUsage.bytesOf(pages);
    }

    private static String requireRef(String ref) {
        String stripped = ref == null ? "" : ref.strip();
        if (stripped.isEmpty()) {
            throw OfficiumException.badRequest("ref_required", "A change needs its ref, like the commit's sha");
        }
        if (stripped.length() > MAX_REF_LENGTH) {
            throw OfficiumException.badRequest("ref_too_long",
                    "A change's ref has at most " + MAX_REF_LENGTH + " characters");
        }
        return stripped;
    }

    private static String requireTitle(String title) {
        String firstLine = title == null ? "" : title.strip().lines().findFirst().orElse("").strip();
        if (firstLine.isEmpty()) {
            throw OfficiumException.badRequest("title_required", "A change needs a title, like the commit's subject");
        }
        return firstLine.length() <= MAX_TITLE_LENGTH
                ? firstLine
                : firstLine.substring(0, MAX_TITLE_LENGTH - 1) + "…";
    }

    private static String url(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String stripped = url.strip();
        if (!(stripped.startsWith("https://") || stripped.startsWith("http://"))
                || stripped.length() > MAX_URL_LENGTH || stripped.chars().anyMatch(Character::isWhitespace)) {
            throw OfficiumException.badRequest("invalid_url",
                    "A change's link is an http(s) URL of at most " + MAX_URL_LENGTH + " characters");
        }
        return stripped;
    }

    private static List<String> areas(List<String> areas) {
        Set<String> unique = new LinkedHashSet<>();
        for (String area : areas == null ? List.<String>of() : areas) {
            String stripped = area == null ? "" : area.strip();
            if (stripped.isEmpty()) {
                continue;
            }
            if (stripped.length() > MAX_AREA_LENGTH) {
                throw OfficiumException.badRequest("area_too_long",
                        "An area has at most " + MAX_AREA_LENGTH + " characters");
            }
            unique.add(stripped);
        }
        if (unique.size() > MAX_AREAS) {
            throw OfficiumException.badRequest("too_many_areas", "A change lists at most " + MAX_AREAS + " areas");
        }
        return new ArrayList<>(unique);
    }

    private static List<String> pages(List<String> pages) {
        Set<String> unique = new LinkedHashSet<>();
        for (String page : pages == null ? List.<String>of() : pages) {
            unique.add(DocPage.normalizePath(page));
        }
        if (unique.size() > MAX_PAGES) {
            throw OfficiumException.badRequest("too_many_pages", "A change names at most " + MAX_PAGES + " pages");
        }
        return new ArrayList<>(unique);
    }
}
