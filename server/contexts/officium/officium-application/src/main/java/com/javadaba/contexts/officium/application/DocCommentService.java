package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocComment;
import com.javadaba.contexts.officium.domain.DocCommentReaction;
import com.javadaba.contexts.officium.domain.DocCommentThreads;
import com.javadaba.contexts.officium.domain.DocCommentThreads.Thread;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.DocPageSummary;
import com.javadaba.contexts.officium.domain.DocQuote;
import com.javadaba.contexts.officium.domain.DocQuoteMatch;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.DocCommentRepository;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Comments on documentation pages (JAVA-797, contract §8): threads anchored by a quote, one level of replies,
 * resolve and reopen, reactions. The permission matrix lives here, never in the web: editors and owners
 * write, viewers read; the author edits, the author or the owner deletes; archived pages are read only,
 * Officium's own take none, and an unpublished draft's comments are its creator's. Comments are keyed by page
 * id, so reads and writes follow a redirect from an old path.
 */
@ApplicationScoped
public class DocCommentService {

    /** Which threads a read returns. */
    public enum State {
        OPEN, RESOLVED, ALL;

        boolean admits(Thread thread) {
            return this == ALL || (this == OPEN) == (thread.resolvedAt() == null);
        }

        /** {@code open} when nothing is said; the REST routes and the MCP operations read the same words. */
        public static State parse(String value) {
            if (value == null || value.isBlank()) {
                return OPEN;
            }
            try {
                return valueOf(value.strip().toUpperCase(java.util.Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw OfficiumException.badRequest("invalid_state", "`state` is open, resolved or all");
            }
        }
    }

    private final DocCommentRepository comments;
    private final DocPageRepository docs;
    private final ProjectAccessGuard guard;
    private final DocRedirectResolver redirects;
    private final StorageQuotaService quota;
    private final ActivityPublisher activity;
    private final Clock clock;

    @Inject
    public DocCommentService(DocCommentRepository comments, DocPageRepository docs, ProjectAccessGuard guard,
            DocRedirectResolver redirects, StorageQuotaService quota, ActivityPublisher activity) {
        this(comments, docs, guard, redirects, quota, activity, Clock.systemUTC());
    }

    DocCommentService(DocCommentRepository comments, DocPageRepository docs, ProjectAccessGuard guard,
            DocRedirectResolver redirects, StorageQuotaService quota, ActivityPublisher activity, Clock clock) {
        this.comments = comments;
        this.docs = docs;
        this.guard = guard;
        this.redirects = redirects;
        this.quota = quota;
        this.activity = activity;
        this.clock = clock;
    }

    public List<Thread> list(UUID accountId, UUID projectId, String path, State state) {
        guard.requireAccess(projectId, accountId);
        if (DocPage.isBuiltin(DocPage.normalizePath(path))) {
            return List.of();
        }
        DocPage page = page(accountId, projectId, path);
        return threadsOf(page).stream().filter(state::admits).toList();
    }

    /** The threads of every page the caller sees, newest activity first. */
    public List<Thread> listProject(UUID accountId, UUID projectId, State state, int limit) {
        guard.requireAccess(projectId, accountId);
        Map<UUID, DocPageSummary> visible = new HashMap<>();
        for (DocPageSummary summary : docs.list(projectId, accountId)) {
            visible.put(summary.id(), summary);
        }
        Map<UUID, List<DocComment>> byPage = new HashMap<>();
        for (DocComment comment : comments.listByPages(visible.keySet())) {
            byPage.computeIfAbsent(comment.pageId(), k -> new java.util.ArrayList<>()).add(comment);
        }
        List<Thread> threads = new java.util.ArrayList<>();
        for (var entry : byPage.entrySet()) {
            docs.find(projectId, visible.get(entry.getKey()).path()).ifPresent(page -> threads
                    .addAll(build(page, entry.getValue())));
        }
        return threads.stream().filter(state::admits)
                .sorted(Comparator.comparing(Thread::lastActivityAt).reversed()).limit(Math.max(1, limit)).toList();
    }

    /** A thread or a reply; {@code quote} only on a thread, {@code parentId} only on a reply. */
    public Thread add(UUID accountId, UUID projectId, String path, String text, DocQuote quote, UUID parentId,
            Actor actor) {
        var access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage page = writablePage(accountId, projectId, path);
        Instant now = Instant.now(clock);
        DocComment saved;
        if (parentId == null) {
            saved = DocComment.root(page.id(), actor, text, anchored(page, quote), now);
        } else {
            if (quote != null) {
                throw OfficiumException.badRequest("reply_has_quote", "A reply has no quote: it belongs to its thread");
            }
            DocComment target = find(page, parentId);
            saved = DocComment.reply(target, actor, text, now);
        }
        quota.requireRoom(access.project(), saved.bytes());
        comments.insert(saved);
        if (parentId != null) {
            DocComment root = find(page, parentId);
            if (root.resolved()) {
                comments.update(root.reopened());
            }
        }
        recorded(page, actor, now, parentId == null ? "Comment added" : "Reply added");
        return threadOf(page, parentId == null ? saved.id() : rootIdOf(page, parentId));
    }

    public Thread edit(UUID accountId, UUID projectId, String path, UUID commentId, String text, Actor actor) {
        var access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage page = writablePage(accountId, projectId, path);
        DocComment existing = find(page, commentId);
        if (!existing.editableBy(accountId)) {
            throw OfficiumException.forbidden("not_comment_author", "Only the author edits a comment");
        }
        DocComment edited = existing.withText(text, Instant.now(clock));
        if (edited.text().equals(existing.text())) {
            return threadOf(page, rootIdOf(page, commentId));
        }
        quota.requireRoom(access.project(), edited.bytes() - existing.bytes());
        comments.update(edited);
        published(page, actor, edited.updatedAt());
        return threadOf(page, rootIdOf(page, commentId));
    }

    /** {@code null} when the whole thread went. */
    public Thread delete(UUID accountId, UUID projectId, String path, UUID commentId, Actor actor) {
        var access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage page = writablePage(accountId, projectId, path);
        DocComment existing = find(page, commentId);
        if (!existing.deletableBy(accountId, access.role() == Role.OWNER)) {
            throw OfficiumException.forbidden("not_comment_author",
                    "Only the author or the project owner deletes a comment");
        }
        Instant now = Instant.now(clock);
        UUID rootId = rootIdOf(page, commentId);
        if (existing.isRoot() && !comments.repliesOf(existing.id()).isEmpty()) {
            comments.update(existing.tombstone(now));
            comments.clearReactions(existing.id());
        } else {
            comments.delete(page.id(), existing.id());
            if (!existing.isRoot()) {
                dropEmptyTombstone(page, rootId);
            }
        }
        published(page, actor, now);
        return comments.find(page.id(), rootId).isPresent() ? threadOf(page, rootId) : null;
    }

    public Thread resolve(UUID accountId, UUID projectId, String path, UUID commentId, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage page = writablePage(accountId, projectId, path);
        DocComment root = find(page, rootIdOf(page, commentId));
        Instant now = Instant.now(clock);
        if (!root.resolved()) {
            comments.update(root.resolvedBy(actor, now));
            published(page, actor, now);
        }
        return threadOf(page, root.id());
    }

    public Thread unresolve(UUID accountId, UUID projectId, String path, UUID commentId, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage page = writablePage(accountId, projectId, path);
        DocComment root = find(page, rootIdOf(page, commentId));
        if (root.resolved()) {
            comments.update(root.reopened());
            published(page, actor, Instant.now(clock));
        }
        return threadOf(page, root.id());
    }

    public Thread react(UUID accountId, UUID projectId, String path, UUID commentId, String emoji, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage page = writablePage(accountId, projectId, path);
        DocComment target = find(page, commentId);
        if (target.deleted()) {
            throw OfficiumException.notFound("comment_not_found", "No such comment");
        }
        Instant now = Instant.now(clock);
        if (comments.addReaction(new DocCommentReaction(target.id(), emoji, accountId, actor.name(), now))) {
            published(page, actor, now);
        }
        return threadOf(page, rootIdOf(page, commentId));
    }

    public Thread unreact(UUID accountId, UUID projectId, String path, UUID commentId, String emoji, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage page = writablePage(accountId, projectId, path);
        DocComment target = find(page, commentId);
        if (comments.removeReaction(target.id(), emoji, accountId)) {
            published(page, actor, Instant.now(clock));
        }
        return threadOf(page, rootIdOf(page, commentId));
    }

    private DocQuote anchored(DocPage page, DocQuote quote) {
        if (quote == null) {
            return null;
        }
        return DocQuoteMatch.find(page.body(), quote).map(DocQuoteMatch.Found::quote).orElseThrow(
                () -> OfficiumException.badRequest("quote_not_found", "The page no longer holds those words: "
                        + "select the text again"));
    }

    private void dropEmptyTombstone(DocPage page, UUID rootId) {
        Optional<DocComment> root = comments.find(page.id(), rootId);
        if (root.isPresent() && root.get().deleted() && comments.repliesOf(rootId).isEmpty()) {
            comments.delete(page.id(), rootId);
        }
    }

    private DocComment find(DocPage page, UUID commentId) {
        return comments.find(page.id(), commentId)
                .orElseThrow(() -> OfficiumException.notFound("comment_not_found", "No such comment"));
    }

    private UUID rootIdOf(DocPage page, UUID commentId) {
        DocComment comment = find(page, commentId);
        return comment.isRoot() ? comment.id() : comment.parentId();
    }

    private Thread threadOf(DocPage page, UUID rootId) {
        return threadsOf(page).stream().filter(t -> t.id().equals(rootId)).findFirst().orElse(null);
    }

    private List<Thread> threadsOf(DocPage page) {
        return build(page, comments.listByPage(page.id()));
    }

    private List<Thread> build(DocPage page, List<DocComment> rows) {
        List<UUID> ids = rows.stream().map(DocComment::id).toList();
        return DocCommentThreads.build(page, rows, comments.reactionsOf(ids));
    }

    /** Anyone who can see the page may read; a redirect from an old path is followed. */
    private DocPage page(UUID accountId, UUID projectId, String path) {
        String normalized = DocPage.normalizePath(path);
        return docs.find(projectId, normalized).filter(p -> p.visibleTo(accountId))
                .or(() -> redirects.follow(projectId, normalized).map(DocRedirectResolver.Followed::page)
                        .filter(p -> p.visibleTo(accountId)))
                .orElseThrow(() -> OfficiumException.notFound("doc_not_found", "No such page"));
    }

    private DocPage writablePage(UUID accountId, UUID projectId, String path) {
        String normalized = DocPage.normalizePath(path);
        if (DocPage.isBuiltin(normalized)) {
            throw OfficiumException.forbidden("builtin_doc_read_only", "Pages under \"" + DocPage.BUILTIN_PREFIX
                    + "/\" are Officium's own documentation: they take no comments");
        }
        DocPage page = page(accountId, projectId, path);
        if (page.lifecycle().archived()) {
            throw OfficiumException.conflict("doc_archived", "\"" + page.path() + "\" is archived: unarchive it first");
        }
        return page;
    }

    private void recorded(DocPage page, Actor actor, Instant at, String summary) {
        if (page.lifecycle().published()) {
            activity.record(page.projectId(), null, null, actor, "doc.comment",
                    summary + " on page \"" + page.path() + "\"", at);
        }
        published(page, actor, at);
    }

    /** An unpublished draft tells nobody: the event names its path to every member. */
    private void published(DocPage page, Actor actor, Instant at) {
        if (page.lifecycle().published()) {
            activity.publishDoc("doc.comment", page.projectId(), page.path(), null, actor, at);
        }
    }
}
