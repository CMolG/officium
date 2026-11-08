package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.DocRevision;
import com.javadaba.contexts.officium.domain.DocSettings;
import com.javadaba.contexts.officium.domain.DocStorage;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.DocHistoryRepository;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import com.javadaba.contexts.officium.domain.ports.StorageUsageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * A page's kept versions and the project's history window (JAVA-794, design §4). Which versions
 * are kept is decided when a page is written ({@link DocService}); this serves them, restores one
 * as a new version (so a restore is undoable) and deletes one for good.
 */
@ApplicationScoped
public class DocHistoryService {

    private final DocPageRepository docs;
    private final DocHistoryRepository history;
    private final DocService pages;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final StorageUsageRepository usage;
    private final Clock clock;

    @Inject
    public DocHistoryService(DocPageRepository docs, DocHistoryRepository history, DocService pages,
            ProjectAccessGuard guard, ActivityPublisher activity, StorageUsageRepository usage) {
        this(docs, history, pages, guard, activity, usage, Clock.systemUTC());
    }

    DocHistoryService(DocPageRepository docs, DocHistoryRepository history, DocService pages,
            ProjectAccessGuard guard, ActivityPublisher activity, StorageUsageRepository usage, Clock clock) {
        this.docs = docs;
        this.history = history;
        this.pages = pages;
        this.guard = guard;
        this.activity = activity;
        this.usage = usage;
        this.clock = clock;
    }

    public HistoryView history(UUID accountId, UUID projectId, String path) {
        guard.requireAccess(projectId, accountId);
        DocPage page = requirePage(projectId, path, accountId);
        int days = history.settings(projectId).historyDays();
        List<RevisionView> revisions = history.revisions(page.id()).stream()
                .map(revision -> RevisionView.of(revision, days)).toList();
        return new HistoryView(DocPageView.of(page), days, revisions);
    }

    /** The revision becomes a new version of the page, so restoring it can itself be undone. */
    public DocService.Upserted restore(UUID accountId, UUID projectId, String path, UUID revisionId,
            Integer expectedVersion, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage page = requirePage(projectId, path, accountId);
        DocRevision revision = history.revision(page.id(), revisionId).orElseThrow(DocHistoryService::revisionNotFound);
        return pages.upsert(accountId, projectId, path, revision.title(), revision.body(), expectedVersion, actor);
    }

    /** Final, heaviest included. The page's title must be typed, the same friction for an agent as a person. */
    public void deleteRevision(UUID accountId, UUID projectId, String path, UUID revisionId, String confirm,
            Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage page = requirePage(projectId, path, accountId);
        if (confirm == null || !confirm.strip().equals(page.title())) {
            throw OfficiumException.badRequest("confirmation_mismatch",
                    "Deleting a version is final: type the page's title (\"" + page.title() + "\") to confirm");
        }
        if (!history.deleteRevision(page.id(), revisionId, history.settings(projectId).historyDays(),
                Instant.now(clock))) {
            throw revisionNotFound();
        }
        record(projectId, page.path(), actor, "doc.revision.deleted",
                "Deleted a version of page \"" + page.path() + "\"");
    }

    public SettingsView settings(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return settingsView(projectId);
    }

    public SettingsView updateSettings(UUID accountId, UUID projectId, Integer historyDays, Integer expectedVersion,
            Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.OWNER);
        if (historyDays == null) {
            throw OfficiumException.badRequest("invalid_history_days", "Say how many days to keep history");
        }
        Instant now = Instant.now(clock);
        DocSettings current = history.settings(projectId);
        if (expectedVersion != null && expectedVersion != current.version()) {
            throw OfficiumException.conflict("version_conflict", "The settings changed since you read them");
        }
        DocSettings next = current.withHistoryDays(historyDays, actor, now);
        if (!history.saveSettings(next, current.version(), now)) {
            throw OfficiumException.conflict("version_conflict", "The settings changed since you read them");
        }
        record(projectId, null, actor, "doc.settings.updated", "Page history is now kept for " + historyDays + " days");
        return settingsView(projectId);
    }

    /** The hourly sweep's step: deletes every revision past its project's window. */
    public int sweep() {
        return history.sweepExpired(Instant.now(clock));
    }

    private SettingsView settingsView(UUID projectId) {
        DocSettings settings = history.settings(projectId);
        DocStorage storage = usage.docStorageOf(projectId);
        return new SettingsView(settings.historyDays(), settings.version(), ActorJson.of(settings.updatedBy()),
                settings.updatedAt(), storage);
    }

    /** Another member's unpublished draft has no history for the caller, as it has no page (JAVA-793). */
    private DocPage requirePage(UUID projectId, String path, UUID accountId) {
        String normalized = DocPage.normalizePath(path);
        return docs.find(projectId, normalized).filter(page -> page.visibleTo(accountId))
                .orElseThrow(() -> OfficiumException.notFound("doc_not_found", "No such page"));
    }

    /** {@code path} is null for project-wide settings: every open page re-reads. */
    private void record(UUID projectId, String path, Actor actor, String operation, String text) {
        Instant now = Instant.now(clock);
        activity.record(projectId, null, null, actor, operation, text, now);
        activity.publishDoc("doc.changed", projectId, path, null, actor, now);
    }

    private static OfficiumException revisionNotFound() {
        return OfficiumException.notFound("doc_revision_not_found", "No such version of the page");
    }

    /** {@code expiresAt} is null for the heaviest version, which never expires. */
    public record RevisionView(UUID id, int version, String title, String body, long sizeBytes, ActorJson author,
            Instant writtenAt, Instant retiredAt, Instant expiresAt, boolean heaviest) {

        static RevisionView of(DocRevision revision, int historyDays) {
            return new RevisionView(revision.id(), revision.version(), revision.title(), revision.body(),
                    revision.weightBytes(), ActorJson.of(revision.author()), revision.writtenAt(),
                    revision.retiredAt(), revision.expiresAt(historyDays), revision.heaviest());
        }
    }

    public record HistoryView(DocPageView current, int historyDays, List<RevisionView> revisions) {
    }

    public record SettingsView(int historyDays, int version, ActorJson updatedBy, Instant updatedAt,
            DocStorage storage) {
    }
}
