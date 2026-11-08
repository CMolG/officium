package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocEditSession;
import com.javadaba.contexts.officium.domain.DocLint;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.ports.DocEditSessionRepository;
import com.javadaba.contexts.officium.domain.ports.DocHistoryRepository;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import java.util.UUID;

/**
 * A project's documentation (JAVA-130, contract §8.7): Markdown pages an agent reads and keeps up
 * to date through the MCP as much as a person does on the web, so both adapters call only this.
 *
 * <p>A write is an upsert by path because that is how an agent thinks of a procedure ("the deploy
 * page"), but it is never a blind overwrite: changing a page that exists takes the version the
 * caller read, and a stale or missing one answers the current page to merge onto.
 *
 * <p>Officium's own pages ({@link BuiltinDocs}, JAVA-783) are merged into every project's reads and
 * refused to every write: one source, the same in every project, changed only by a deploy.
 */
@ApplicationScoped
public class DocService {

    private final DocPageRepository docs;
    private final BuiltinDocs builtins;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final StorageQuotaService quota;
    private final DocHistoryRepository history;
    private final DocEditSessionRepository sessions;
    private final DocRedirectResolver redirects;
    private final DocTemplates templates;
    private final Clock clock;

    @Inject
    public DocService(DocPageRepository docs, BuiltinDocs builtins, ProjectAccessGuard guard,
            ActivityPublisher activity,
            StorageQuotaService quota, DocHistoryRepository history, DocEditSessionRepository sessions,
            DocRedirectResolver redirects, DocTemplates templates) {
        this(docs, builtins, guard, activity, quota, history, sessions, redirects, templates, Clock.systemUTC());
    }

    DocService(DocPageRepository docs, BuiltinDocs builtins, ProjectAccessGuard guard, ActivityPublisher activity,
            StorageQuotaService quota, DocHistoryRepository history, DocEditSessionRepository sessions,
            DocRedirectResolver redirects, DocTemplates templates, Clock clock) {
        this.redirects = redirects;
        this.templates = templates;
        this.history = history;
        this.sessions = sessions;
        this.docs = docs;
        this.builtins = builtins;
        this.guard = guard;
        this.activity = activity;
        this.quota = quota;
        this.clock = clock;
    }

    public List<DocPageView.Summary> list(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return merged(docs.list(projectId, accountId).stream().map(DocPageView.Summary::of),
                builtins.all().stream().map(DocPageView.Summary::of));
    }

    /** The project's templates (JAVA-801), out of {@link #list}: each with the collection it belongs to. */
    public List<DocTemplateView> templates(UUID accountId, UUID projectId) {
        return templates.list(accountId, projectId);
    }

    public DocPageView get(UUID accountId, UUID projectId, String path) {
        guard.requireAccess(projectId, accountId);
        String normalized = DocPage.normalizePath(path);
        if (DocPage.isBuiltin(normalized)) {
            return DocPageView.of(builtins.find(normalized).map(page -> page.in(projectId))
                    .orElseThrow(DocService::notFound));
        }
        DocPage page = docs.find(projectId, normalized).filter(found -> found.visibleTo(accountId)).orElse(null);
        if (page != null) {
            return DocPageView.of(page);
        }
        return redirects.follow(projectId, normalized).filter(followed -> followed.page().visibleTo(accountId))
                .map(followed -> DocPageView.of(followed.page()).withRedirectedFrom(followed.redirectedFrom()))
                .orElseThrow(DocService::notFound);
    }

    /**
     * Creates the page at {@code path}, or changes the one there. {@code expectedVersion} is left out
     * (or 0) to create, and is the version read to change; {@code null} title or body keeps the
     * page's. Writing what the page already says writes nothing.
     */
    public Upserted upsert(UUID accountId, UUID projectId, String path, String title, String body,
            Integer expectedVersion, Actor actor) {
        return upsert(accountId, projectId, path, title, body, expectedVersion, null, actor);
    }

    /**
     * {@code draft} true creates the page unpublished: only its creator sees it until it is published,
     * and it records no activity meanwhile (JAVA-793). It only means something on create. A change to a
     * path a page moved from follows the redirect, and a create there replaces it (JAVA-792).
     */
    public Upserted upsert(UUID accountId, UUID projectId, String path, String title, String body,
            Integer expectedVersion, Boolean draft, Actor actor) {
        return upsert(accountId, projectId, path, title, body, expectedVersion, draft, null, actor);
    }

    /**
     * {@code editSession} names the editing session an autosave belongs to (JAVA-796): a write that
     * continues the session of the page's last checkpoint ({@link DocEditSession#continuedBy}) keeps
     * no version and records no activity, though readers still hear of it. Any other write is a
     * checkpoint, as before, and opens the session it names.
     */
    public Upserted upsert(UUID accountId, UUID projectId, String path, String title, String body,
            Integer expectedVersion, Boolean draft, String editSession, Actor actor) {
        return upsert(accountId, projectId, path, title, body, expectedVersion, draft, editSession,
                DocTemplates.Request.NONE, actor);
    }

    /**
     * {@code template} makes the page a template, or fills it from one (JAVA-801, {@link DocTemplates}):
     * both only on create.
     */
    public Upserted upsert(UUID accountId, UUID projectId, String path, String title, String body,
            Integer expectedVersion, Boolean draft, String editSession, DocTemplates.Request template, Actor actor) {
        return upsert(accountId, projectId, path, title, body, expectedVersion, draft, editSession, template, actor,
                List.of());
    }

    /**
     * {@code coAuthors}: who else wrote this version, taken by the caller from a live room's own board and
     * never from the request (JAVA-803). The saved version names them.
     */
    public Upserted upsert(UUID accountId, UUID projectId, String path, String title, String body,
            Integer expectedVersion, Boolean draft, String editSession, DocTemplates.Request template, Actor actor,
            List<Actor> coAuthors) {
        DocEditSession.requireValid(editSession);
        DocTemplates.requireCoherent(template, body, draft);
        Upserted written = write(accountId, projectId, path, title, body, expectedVersion, draft, editSession, template,
                actor, coAuthors);
        return written.withLinks(redirects.linkFindings(projectId, written.page().path(), written.page().body()));
    }

    private Upserted write(UUID accountId, UUID projectId, String path, String title, String body,
            Integer expectedVersion, Boolean draft, String editSession, DocTemplates.Request template, Actor actor,
            List<Actor> coAuthors) {
        String normalized = requireWritable(accountId, projectId, path);
        var access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        String reserved = DocPage.reservedFor(normalized);
        if (reserved != null) {
            throw OfficiumException.badRequest("reserved_doc_path",
                    "\"" + normalized + "\" is where " + reserved + " lives: give the page another path");
        }
        Instant now = Instant.now(clock);
        DocPage existing = docs.find(projectId, normalized).orElse(null);
        if (existing != null && !existing.visibleTo(accountId)) {
            throw pathTaken();
        }
        String redirectedFrom = null;
        if (existing == null && expectedVersion != null && expectedVersion >= 1) {
            var followed = redirects.follow(projectId, normalized).filter(f -> f.page().visibleTo(accountId));
            if (followed.isPresent()) {
                existing = followed.get().page();
                redirectedFrom = normalized;
                normalized = existing.path();
            }
        }

        if (existing == null) {
            if (expectedVersion != null && expectedVersion != 0) {
                throw notFound();
            }
            var content = templates.prepare(projectId, accountId, normalized, title, body, template, actor, now);
            DocPage page = DocPage.created(projectId, normalized, content.title(), content.body(), actor, now,
                    Boolean.TRUE.equals(draft), content.template());
            quota.requireRoom(access.project(), page.bytes());
            if (!docs.insert(page)) {
                throw conflictWithFresh(docs, projectId, normalized, accountId);
            }
            record(page, actor, "doc.created", "created", now, page.version());
            if (editSession != null) {
                checkpoint(page, editSession, actor, now);
            }
            return new Upserted(DocPageView.of(page), true);
        }

        DocTemplates.requireCreate(template);
        if (Boolean.TRUE.equals(draft)) {
            throw OfficiumException.badRequest("draft_only_on_create",
                    "`draft` only means something when the page is created; publish it with docs.publish");
        }
        if (existing.lifecycle().archived()) {
            throw OfficiumException.conflict("doc_archived", "\"" + normalized
                    + "\" is archived: unarchive it before changing it");
        }
        if (expectedVersion == null || expectedVersion != existing.version()) {
            throw new DocVersionConflictException(DocPageView.of(existing).withRedirectedFrom(redirectedFrom));
        }
        DocPage edited = existing.edited(title, body, actor, now).withCoAuthors(coAuthors);
        if (edited.sameContentAs(existing)) {
            return new Upserted(DocPageView.of(existing).withRedirectedFrom(redirectedFrom), false);
        }
        long delta = edited.bytes() - existing.bytes();
        quota.requireRoom(access.project(), delta);
        if (sessions.find(existing.id()).filter(open -> open.continuedBy(editSession, actor, now)).isPresent()) {
            if (!docs.updateIfVersion(edited, expectedVersion)) {
                throw conflictWithFresh(docs, projectId, normalized, accountId);
            }
            announce(edited, actor, now, edited.version());
            return new Upserted(DocPageView.of(edited).withRedirectedFrom(redirectedFrom), false);
        }
        // What the page's own delta leaves of the allowance is the history's room (JAVA-794).
        long room = quota.roomLeft(access.project()) - Math.max(delta, 0);
        var saved = history.updateKeepingHistory(edited, expectedVersion, Math.max(room, 0),
                history.settings(projectId).historyDays(), now);
        if (!saved.updated()) {
            throw conflictWithFresh(docs, projectId, normalized, accountId);
        }
        record(edited, actor, "doc.updated", "updated", now, edited.version());
        checkpoint(edited, editSession, actor, now);
        return new Upserted(DocPageView.of(edited).withRedirectedFrom(redirectedFrom), false, saved.historyKept(),
                saved.revisionId());
    }

    /** Moves the page to the trash, where it waits {@code purgeAfter} for a restore (JAVA-793). */
    public Trashed delete(UUID accountId, UUID projectId, String path, int expectedVersion, Actor actor) {
        String normalized = requireWritable(accountId, projectId, path);
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage current = requireVisible(projectId, normalized, accountId);
        Instant now = Instant.now(clock);
        DocPage trashed = current.withLifecycle(current.lifecycle().trash(actor, now));
        if (current.version() != expectedVersion || !docs.updateLifecycle(trashed, current.lifecycle())) {
            throw conflictWithFresh(docs, projectId, normalized, accountId);
        }
        record(current, actor, "doc.deleted", "deleted", now, null);
        return new Trashed(current.id(), trashed.lifecycle().purgeAfter());
    }

    /** What a delete answers: the id to restore it by, and when the sweep purges it. */
    public record Trashed(UUID id, Instant purgeAfter) {
    }

    /** {@code created} tells REST to answer 201 instead of 200. */
    public record Upserted(DocPageView page, boolean created, boolean historyKept, UUID revisionId,
            List<DocLint.Finding> links) {

        public Upserted(DocPageView page, boolean created) {
            this(page, created, true, null, List.of());
        }

        public Upserted(DocPageView page, boolean created, boolean historyKept, UUID revisionId) {
            this(page, created, historyKept, revisionId, List.of());
        }

        Upserted withLinks(List<DocLint.Finding> found) {
            return new Upserted(page, created, historyKept, revisionId, found);
        }

        /**
         * The page with what the page schema's lint finds in it (JAVA-781) and what its links find
         * (JAVA-792): warnings, it is saved.
         */
        public DocPageView.Linted linted() {
            List<DocLint.Finding> findings = new java.util.ArrayList<>(DocLint.lint(page.body()));
            findings.addAll(links);
            return new DocPageView.Linted(page, findings, historyKept, revisionId);
        }
    }

    /**
     * The normalized path, once the caller is known to be in the project and the path is not a
     * built-in page's: those are refused to every role, owner included, so the answer is the same
     * whoever asks (a stranger still learns nothing: membership is checked first).
     */
    private String requireWritable(UUID accountId, UUID projectId, String path) {
        guard.requireAccess(projectId, accountId);
        String normalized = DocPage.normalizePath(path);
        if (DocPage.isBuiltin(normalized)) {
            throw OfficiumException.forbidden("builtin_doc_read_only", "Pages under \"" + DocPage.BUILTIN_PREFIX
                    + "/\" are Officium's own documentation, the same in every project: nobody can change or delete "
                    + "them from a project. Give your page another path.");
        }
        return normalized;
    }

    private static List<DocPageView.Summary> merged(Stream<DocPageView.Summary> own,
            Stream<DocPageView.Summary> builtin) {
        return Stream.concat(own, builtin).sorted(Comparator.comparing(DocPageView.Summary::path)).toList();
    }

    /** A draft records nothing until it is published: nobody else can see it, so there is nothing to tell. */
    private void record(DocPage page, Actor actor, String operation, String verb, Instant at, Integer version) {
        if (!page.lifecycle().published()) {
            return;
        }
        activity.record(page.projectId(), null, null, actor, operation, "Page \"" + page.path() + "\" " + verb, at);
        announce(page, actor, at, version);
    }

    /** Readers of a published page hear of every write, an autosave inside a session included. */
    private void announce(DocPage page, Actor actor, Instant at, Integer version) {
        if (page.lifecycle().published()) {
            activity.publishDoc("doc.changed", page.projectId(), page.path(), version, actor, at);
        }
    }

    /** A checkpoint opens the session its write named, and a write that named none closes it. */
    private void checkpoint(DocPage page, String editSession, Actor actor, Instant at) {
        sessions.save(page.id(), editSession == null ? null : new DocEditSession(editSession, actor, at));
    }

    /** The page, unless it is another member's unpublished draft: that one does not exist for the caller. */
    private DocPage requireVisible(UUID projectId, String path, UUID accountId) {
        return docs.find(projectId, path).filter(page -> page.visibleTo(accountId))
                .orElseThrow(() -> redirects.notFound(projectId, path));
    }

    /**
     * The write lost a race: answer what won, or that the page is gone. Shared with {@link DocLifecycleService},
     * which lost its own compare-and-set the same way (JAVA-1471): the one answer, so a copy cannot drift.
     */
    static OfficiumException conflictWithFresh(DocPageRepository docs, UUID projectId, String path, UUID accountId) {
        return docs.find(projectId, path)
                .<OfficiumException>map(fresh -> fresh.visibleTo(accountId)
                        ? new DocVersionConflictException(DocPageView.of(fresh))
                        : pathTaken())
                .orElseGet(DocService::notFound);
    }

    /** Somebody else's unpublished draft holds the path: say so without handing the page over. */
    private static OfficiumException pathTaken() {
        return OfficiumException.conflict("doc_path_taken",
                "That path is taken by a page you cannot see yet: give yours another path");
    }

    private static OfficiumException notFound() {
        return OfficiumException.notFound("doc_not_found", "No such page");
    }
}
