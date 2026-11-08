package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * A documentation page of a project (JAVA-130, contract §8.7): Markdown, whose images are files of the page. Its identity
 * inside the project is its {@code path} -- {@code procedures/deploy} -- so the tree is the paths
 * themselves and a page is reached the same way by a person, a link and an agent.
 *
 * <p>{@code template} (JAVA-801): a page kept out of the tree and search, copied into new pages by
 * {@link DocTemplate}. It is born one and stays one.
 */
public record DocPage(UUID id, UUID projectId, String path, String title, String body, int version,
        Actor createdBy, Actor updatedBy, Instant createdAt, Instant updatedAt, DocLifecycle lifecycle,
        boolean template, List<Actor> coAuthors) {

    public static final int MAX_PATH_LENGTH = 200;
    public static final int MAX_DEPTH = 8;
    public static final int MAX_TITLE_LENGTH = 200;

    /** Where the web shows the changelog (JAVA-132): not a page, so no page may take the path. */
    public static final String CHANGELOG_PATH = "documentation/changelog";

    /** Where the web shows the test-run history (JAVA-766): reserved the same way. */
    public static final String TEST_HISTORY_PATH = "documentation/test-history";

    /** The web's unpublished-drafts, archive and trash sections (JAVA-793): reserved the same way. */
    public static final String UNPUBLISHED_PATH = "documentation/unpublished";
    public static final String ARCHIVE_PATH = "documentation/archive";
    public static final String TRASH_PATH = "documentation/trash";

    /** The web's recent-pages section (JAVA-799): reserved the same way. */
    public static final String RECENT_PATH = "documentation/recent";

    /** The web's full-text search section (JAVA-800): reserved the same way. */
    public static final String SEARCH_PATH = "documentation/search";
    /** The web's templates section (JAVA-801): reserved the same way. */
    public static final String TEMPLATES_PATH = "documentation/templates";

    /**
     * Officium's own pages (JAVA-783): one read-only set, shipped with the API and shown in every
     * project under this prefix, so no project page may live there.
     */
    public static final String BUILTIN_PREFIX = "officium";

    private static final Pattern SEGMENT = Pattern.compile("[a-z0-9]+(?:-[a-z0-9]+)*");

    public DocPage {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(projectId, "projectId");
        Objects.requireNonNull(path, "path");
        Objects.requireNonNull(title, "title");
        body = body == null ? "" : body;
        lifecycle = lifecycle == null ? DocLifecycle.publishedAt(createdAt) : lifecycle;
        coAuthors = coAuthors == null ? List.of() : List.copyOf(coAuthors);
    }

    /** A page with no co-authors: the people who edited it live in a room beside its saver (JAVA-803). */
    public DocPage(UUID id, UUID projectId, String path, String title, String body, int version, Actor createdBy,
            Actor updatedBy, Instant createdAt, Instant updatedAt, DocLifecycle lifecycle, boolean template) {
        this(id, projectId, path, title, body, version, createdBy, updatedBy, createdAt, updatedAt, lifecycle, template,
                null);
    }

    /** A page, not a template. */
    public DocPage(UUID id, UUID projectId, String path, String title, String body, int version, Actor createdBy,
            Actor updatedBy, Instant createdAt, Instant updatedAt, DocLifecycle lifecycle) {
        this(id, projectId, path, title, body, version, createdBy, updatedBy, createdAt, updatedAt, lifecycle, false,
                null);
    }

    /** A page that is published as it is created: Officium's own, and what the previous release wrote. */
    public DocPage(UUID id, UUID projectId, String path, String title, String body, int version, Actor createdBy,
            Actor updatedBy, Instant createdAt, Instant updatedAt) {
        this(id, projectId, path, title, body, version, createdBy, updatedBy, createdAt, updatedAt, null);
    }

    public static DocPage created(UUID projectId, String path, String title, String body, Actor actor, Instant now) {
        return created(projectId, path, title, body, actor, now, false);
    }

    /** {@code draft}: born unpublished, so only its creator sees it until it is published. */
    public static DocPage created(UUID projectId, String path, String title, String body, Actor actor, Instant now,
            boolean draft) {
        return created(projectId, path, title, body, actor, now, draft, false);
    }

    /** {@code template}: born a template, which is always published (a draft template is refused before). */
    public static DocPage created(UUID projectId, String path, String title, String body, Actor actor, Instant now,
            boolean draft, boolean template) {
        if (title == null) {
            throw OfficiumException.badRequest("title_required", "A page needs a title");
        }
        return new DocPage(UUID.randomUUID(), projectId, normalizePath(path), requireTitle(title), body, 1, actor,
                actor, now, now, draft ? DocLifecycle.unpublishedDraft() : DocLifecycle.publishedAt(now), template,
                null);
    }

    /** {@code null} keeps what the page had, so an agent can rewrite the body alone. */
    public DocPage edited(String newTitle, String newBody, Actor actor, Instant now) {
        return new DocPage(id, projectId, path, newTitle == null ? title : requireTitle(newTitle),
                newBody == null ? body : newBody, version + 1, createdBy, actor, createdAt, now, lifecycle, template,
                null);
    }

    /** Who else wrote this version beside its saver: the people of the room it was saved from (JAVA-803). */
    public DocPage withCoAuthors(List<Actor> people) {
        return new DocPage(id, projectId, path, title, body, version, createdBy, updatedBy, createdAt, updatedAt,
                lifecycle, template, people);
    }

    /** The same page at another path: a move changes nothing else, the version included (JAVA-792). */
    public DocPage withPath(String newPath) {
        return new DocPage(id, projectId, newPath, title, body, version, createdBy, updatedBy, createdAt, updatedAt,
                lifecycle, template, coAuthors);
    }

    public DocPage withLifecycle(DocLifecycle next) {
        return new DocPage(id, projectId, path, title, body, version, createdBy, updatedBy, createdAt, updatedAt, next,
                template, coAuthors);
    }

    public boolean visibleTo(UUID accountId) {
        return lifecycle.visibleTo(accountId, createdBy);
    }

    /** The reserved path's explanation, or {@code null} when a page may live at {@code normalized}. */
    public static String reservedFor(String normalized) {
        return switch (normalized) {
            case CHANGELOG_PATH -> "the changelog";
            case TEST_HISTORY_PATH -> "the test history";
            case UNPUBLISHED_PATH -> "the unpublished drafts";
            case ARCHIVE_PATH -> "the archive";
            case TRASH_PATH -> "the trash";
            case RECENT_PATH -> "your recent pages";
            case SEARCH_PATH -> "the search";
            case TEMPLATES_PATH -> "the templates";
            default -> null;
        };
    }

    public boolean sameContentAs(DocPage other) {
        return title.equals(other.title) && body.equals(other.body);
    }

    /** What the page spends of the owner's allowance, in the measure {@link StorageUsage} uses. */
    public long bytes() {
        return StorageUsage.bytesOf(path, title, body);
    }

    /**
     * Lower-case segments of letters, digits and single hyphens, joined by {@code /}. Surrounding
     * slashes and upper case are forgiven, since they can't mean a different page; anything else is
     * refused rather than rewritten, so two spellings never land on one page by surprise.
     */
    public static String normalizePath(String raw) {
        if (raw == null || raw.isBlank()) {
            throw OfficiumException.badRequest("path_required", "A page needs a path, like procedures/deploy");
        }
        String path = raw.strip().toLowerCase(Locale.ROOT);
        while (path.startsWith("/")) {
            path = path.substring(1);
        }
        while (path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        String[] segments = path.split("/", -1);
        if (path.isEmpty() || path.length() > MAX_PATH_LENGTH || segments.length > MAX_DEPTH) {
            throw invalidPath(raw);
        }
        for (String segment : segments) {
            if (!SEGMENT.matcher(segment).matches()) {
                throw invalidPath(raw);
            }
        }
        return path;
    }

    /** Whether a normalized path is the built-in prefix itself or under it. */
    public static boolean isBuiltin(String path) {
        return path.equals(BUILTIN_PREFIX) || path.startsWith(BUILTIN_PREFIX + "/");
    }

    private static OfficiumException invalidPath(String raw) {
        return OfficiumException.badRequest("invalid_doc_path", "\"" + raw + "\" is not a page path: use lower-case "
                + "letters, digits and hyphens, in at most " + MAX_DEPTH + " segments separated by / and "
                + MAX_PATH_LENGTH + " characters, like procedures/deploy");
    }

    private static String requireTitle(String title) {
        String stripped = title.strip();
        if (stripped.isEmpty()) {
            throw OfficiumException.badRequest("title_required", "A page needs a title");
        }
        if (stripped.length() > MAX_TITLE_LENGTH) {
            throw OfficiumException.badRequest("title_too_long",
                    "A page title has at most " + MAX_TITLE_LENGTH + " characters");
        }
        return stripped;
    }
}
