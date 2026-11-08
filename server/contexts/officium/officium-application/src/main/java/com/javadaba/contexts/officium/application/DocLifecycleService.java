package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocLifecycle;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.BiFunction;

/**
 * The life of a documentation page past its content (JAVA-793, design §3): publish an unpublished
 * draft, archive and unarchive a published page, restore or purge what is in the trash, and the
 * sweep that purges the trash after {@link DocLifecycle#TRASH_RETENTION}. Both adapters call only
 * this and {@link DocService}; a transition never bumps the page's version.
 */
@ApplicationScoped
public class DocLifecycleService {

    private final DocPageRepository docs;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final Clock clock;

    @Inject
    public DocLifecycleService(DocPageRepository docs, ProjectAccessGuard guard, ActivityPublisher activity) {
        this(docs, guard, activity, Clock.systemUTC());
    }

    DocLifecycleService(DocPageRepository docs, ProjectAccessGuard guard, ActivityPublisher activity, Clock clock) {
        this.docs = docs;
        this.guard = guard;
        this.activity = activity;
        this.clock = clock;
    }

    /** The caller's own unpublished drafts. */
    public List<DocPageView.Summary> unpublished(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return docs.listUnpublished(projectId, accountId).stream().map(DocPageView.Summary::of).toList();
    }

    public List<DocPageView.Summary> archived(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return docs.listArchived(projectId).stream().map(DocPageView.Summary::of).toList();
    }

    /** Editors and owners only: a viewer cannot restore, so there is nothing for them to see. */
    public List<DocPageView.Summary> trash(UUID accountId, UUID projectId) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        return docs.listTrash(projectId, accountId).stream().map(DocPageView.Summary::of).toList();
    }

    /** Makes an unpublished draft visible to the project. Publishing a published page changes nothing. */
    public DocPageView publish(UUID accountId, UUID projectId, String path, Actor actor) {
        return transition(accountId, projectId, path, actor, "doc.published", "published",
                (page, now) -> page.lifecycle().publish(now));
    }

    public DocPageView archive(UUID accountId, UUID projectId, String path, Actor actor) {
        return transition(accountId, projectId, path, actor, "doc.archived", "archived", (page, now) -> {
            DocTemplates.requireNotTemplate(page);
            return page.lifecycle().archive(actor, now);
        });
    }

    public DocPageView unarchive(UUID accountId, UUID projectId, String path, Actor actor) {
        return transition(accountId, projectId, path, actor, "doc.unarchived", "unarchived",
                (page, now) -> page.lifecycle().unarchive());
    }

    /** Brings a trashed page back to its path; {@code doc_path_taken} when a live page took it meanwhile. */
    public DocPageView restore(UUID accountId, UUID projectId, UUID id, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage trashed = requireTrashed(projectId, id, accountId);
        DocPage restored = trashed.withLifecycle(trashed.lifecycle().restore());
        if (!docs.updateLifecycle(restored, trashed.lifecycle())) {
            if (docs.findTrashed(projectId, id).isEmpty()) {
                throw notFound(); // restored or purged by someone else meanwhile
            }
            throw OfficiumException.conflict("doc_path_taken", "\"" + trashed.path()
                    + "\" has a page again: move or delete that one, or leave this one in the trash");
        }
        record(restored, actor, "doc.restored", "restored", Instant.now(clock));
        return DocPageView.of(restored);
    }

    /** Deletes a trashed page for good, ahead of the sweep. */
    public void purge(UUID accountId, UUID projectId, UUID id, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage trashed = requireTrashed(projectId, id, accountId);
        if (!docs.purgeTrashed(projectId, id)) {
            throw notFound();
        }
        record(trashed, actor, "doc.purged", "deleted for good", Instant.now(clock));
    }

    /** The sweep: everything in the trash for longer than the retention is gone. Returns how many. */
    public int sweep() {
        return docs.purgeTrashedBefore(Instant.now(clock).minus(DocLifecycle.TRASH_RETENTION));
    }

    private DocPageView transition(UUID accountId, UUID projectId, String path, Actor actor, String operation,
            String verb, BiFunction<DocPage, Instant, DocLifecycle> next) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        String normalized = DocPage.normalizePath(path);
        if (DocPage.isBuiltin(normalized)) {
            throw OfficiumException.forbidden("builtin_doc_read_only", "Pages under \"" + DocPage.BUILTIN_PREFIX
                    + "/\" are Officium's own documentation: they cannot be published, archived or deleted");
        }
        DocPage current = docs.find(projectId, normalized).filter(page -> page.visibleTo(accountId))
                .orElseThrow(DocLifecycleService::notFound);
        Instant now = Instant.now(clock);
        DocLifecycle lifecycle = next.apply(current, now);
        if (lifecycle.equals(current.lifecycle())) {
            return DocPageView.of(current);
        }
        DocPage changed = current.withLifecycle(lifecycle);
        if (!docs.updateLifecycle(changed, current.lifecycle())) {
            throw DocService.conflictWithFresh(docs, projectId, normalized, accountId);
        }
        record(changed, actor, operation, verb, now);
        return DocPageView.of(changed);
    }

    /** A trashed page the caller may see: another member's unpublished draft stays theirs even in the trash. */
    private DocPage requireTrashed(UUID projectId, UUID id, UUID accountId) {
        return docs.findTrashed(projectId, id).filter(page -> page.visibleTo(accountId))
                .orElseThrow(DocLifecycleService::notFound);
    }

    /** Like {@link DocService}'s: an unpublished draft is nobody's business but its creator's, so restoring or
     *  purging one writes nothing every member reads, not even its path. Publishing records the first entry. */
    private void record(DocPage page, Actor actor, String operation, String verb, Instant at) {
        if (!page.lifecycle().published()) {
            return;
        }
        activity.record(page.projectId(), null, null, actor, operation, "Page \"" + page.path() + "\" " + verb, at);
        activity.publishDoc("doc.changed", page.projectId(), page.path(), null, actor, at);
    }

    private static OfficiumException notFound() {
        return OfficiumException.notFound("doc_not_found", "No such page");
    }
}
