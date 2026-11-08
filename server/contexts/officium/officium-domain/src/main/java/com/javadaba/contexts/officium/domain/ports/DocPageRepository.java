package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.DocLifecycle;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.DocPageSummary;

import java.util.Collection;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * A project's documentation pages (JAVA-130), keyed by {@code (projectId, path)} among the pages not
 * in the trash. Every read below skips the trash except {@link #listTrash} and {@link #findTrashed};
 * the lists and the search leave out archived pages, and other members' unpublished drafts, in SQL.
 * Templates (JAVA-801) are out of {@link #list} and {@link #search} too: {@link #listTemplates} has them.
 */
public interface DocPageRepository {

    /** The pages of the project in the tree: published or {@code accountId}'s own drafts, not archived. */
    List<DocPageSummary> list(UUID projectId, UUID accountId);

    /** The project's templates not in the trash, by path. A template is never a draft, so everyone sees them. */
    List<DocPageSummary> listTemplates(UUID projectId);

    /** {@code accountId}'s own unpublished drafts. */
    List<DocPageSummary> listUnpublished(UUID projectId, UUID accountId);

    List<DocPageSummary> listArchived(UUID projectId);

    /** The trash, newest deletion first, without other members' unpublished drafts. */
    List<DocPageSummary> listTrash(UUID projectId, UUID accountId);

    /** The page at the path, whatever its lifecycle but the trash: the caller decides who may see it. */
    Optional<DocPage> find(UUID projectId, String path);

    /** The live page with that id (JAVA-803: a room is keyed by id, so a move keeps it). */
    Optional<DocPage> findById(UUID projectId, UUID id);

    Optional<DocPage> findTrashed(UUID projectId, UUID id);

    /** {@code false} when a live page already holds that path (a concurrent create won). */
    boolean insert(DocPage page);

    /**
     * The edit-session autosave (JAVA-796): replaces the page's title, body, version and authors in place,
     * keeping no history revision. Only {@link DocHistoryRepository#updateKeepingHistory} keeps one, which is
     * every other edit. The page is found by id, so a move cannot redirect the write. {@code false} when the
     * version moved on or the page is in the trash.
     */
    boolean updateIfVersion(DocPage page, int expectedVersion);

    /** Which of {@code paths} are a page of the project. */
    Set<String> pathsAmong(UUID projectId, Collection<String> paths);

    /** Which of {@code paths} have at least one page under them. */
    Set<String> parentsAmong(UUID projectId, Collection<String> paths);

    /**
     * Writes the page's lifecycle without touching its version, only while it is still {@code expected}:
     * of two transitions read at once, the second one changes nothing instead of erasing the first.
     * {@code false}: the lifecycle changed meanwhile, or a restore found its path taken.
     */
    boolean updateLifecycle(DocPage page, DocLifecycle expected);

    /** Deletes a page that is in the trash, for good. */
    boolean purgeTrashed(UUID projectId, UUID id);

    /** Deletes every page trashed before {@code cutoff}; how many went. */
    int purgeTrashedBefore(Instant cutoff);
}
