package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocMove;
import com.javadaba.contexts.officium.domain.DocNode;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.DocPageSummary;
import com.javadaba.contexts.officium.domain.DocSortMode;
import com.javadaba.contexts.officium.domain.DocTree;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.DocLinkRepository;
import com.javadaba.contexts.officium.domain.ports.DocMoveRepository;
import com.javadaba.contexts.officium.domain.ports.DocNodeRepository;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Moves, renames and duplicates documentation (JAVA-792, contract §8.20), and answers which pages
 * link to one. A move takes a whole subtree in one transaction and leaves a redirect at every old
 * page path; links are never rewritten (ADR 0022). Both adapters call only this.
 */
@ApplicationScoped
public class DocMoveService {

    /** {@code moved} lists every page's old and new path, so an agent can fix the references it holds. */
    public record Moved(DocTreeView.Node node, List<DocMove.Moved> moved) {
    }

    /** The pages that link to {@code path}, which is where the asked-for path leads when it moved. */
    public record Backlinks(String path, String redirectedFrom, List<DocPageView.Summary> pages) {
    }

    private final DocPageRepository pages;
    private final DocNodeRepository nodes;
    private final DocMoveRepository moves;
    private final DocLinkRepository links;
    private final DocRedirectResolver redirects;
    private final DocService docs;
    private final DocTreeService tree;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final Clock clock;

    @Inject
    public DocMoveService(DocPageRepository pages, DocNodeRepository nodes, DocMoveRepository moves,
            DocLinkRepository links, DocRedirectResolver redirects, DocService docs, DocTreeService tree,
            ProjectAccessGuard guard, ActivityPublisher activity) {
        this(pages, nodes, moves, links, redirects, docs, tree, guard, activity, Clock.systemUTC());
    }

    DocMoveService(DocPageRepository pages, DocNodeRepository nodes, DocMoveRepository moves,
            DocLinkRepository links, DocRedirectResolver redirects, DocService docs, DocTreeService tree,
            ProjectAccessGuard guard, ActivityPublisher activity, Clock clock) {
        this.pages = pages;
        this.nodes = nodes;
        this.moves = moves;
        this.links = links;
        this.redirects = redirects;
        this.docs = docs;
        this.tree = tree;
        this.guard = guard;
        this.activity = activity;
        this.clock = clock;
    }

    /**
     * Moves the page or folder at {@code path} to {@code to}. {@code position} places it among its new
     * siblings; none keeps its place under the same parent and puts it last under another.
     * {@code expectedVersion}, when given, is the node's version (0 for no row).
     */
    public Moved move(UUID accountId, UUID projectId, String path, String to, Integer position,
            Integer expectedVersion, Actor actor) {
        guard.requireAccess(projectId, accountId);
        String from = DocPage.normalizePath(path);
        String target = DocPage.normalizePath(to);
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        List<DocPageSummary> all = treePages(projectId, accountId);
        List<DocMove.Moved> moved = DocMove.plan(from, target, all.stream().map(DocPageSummary::path).toList());
        List<DocNode> rows = nodes.list(projectId);
        List<DocTree.Node> roots = DocTree.build(all, rows);
        DocTree.Node source = DocTree.find(roots, from);
        if (source == null) {
            throw redirects.notFound(projectId, from);
        }
        if (expectedVersion != null && expectedVersion != source.version()) {
            throw new DocNodeConflictException(DocTreeView.Node.of(source));
        }
        if (moved.isEmpty() && DocNode.depth(target) > 1) {
            throw OfficiumException.badRequest("doc_move_empty",
                    "A collection with no pages can only move to the top level");
        }
        if (DocTree.find(roots, target) != null) {
            throw new DocPathTakenException(List.of(target));
        }
        List<String> wanted = new ArrayList<>(moved.stream().map(DocMove.Moved::to).toList());
        wanted.add(target);
        List<String> clashes = templatesAt(projectId, wanted, moved);
        if (!clashes.isEmpty()) {
            throw new DocPathTakenException(clashes);
        }
        Instant now = Instant.now(clock);
        List<DocNode> after = rowsAfter(projectId, from, target, position, roots, rows, now);
        List<DocMove.Moved> nodeRenames = rows.stream().filter(row -> DocMove.isAtOrUnder(row.path(), from))
                .map(row -> new DocMove.Moved(row.path(), DocMove.map(row.path(), from, target))).toList();
        if (!moves.move(projectId, accountId, target, moved, nodeRenames, after)) {
            throw new DocPathTakenException(List.of(target));
        }
        activity.record(projectId, null, null, actor, "doc.moved", "Moved \"" + from + "\" to \"" + target + "\"",
                now);
        // A move changes many paths, so the event names none: every open page re-reads and follows its redirect.
        activity.publishDoc("doc.changed", projectId, null, null, actor, now);
        DocTree.Node placed = DocTree.find(DocTree.build(treePages(projectId, accountId), nodes.list(projectId)),
                target);
        return new Moved(DocTreeView.Node.of(placed), moved);
    }

    /**
     * Copies the page at {@code path} to {@code to} (default: the first free {@code <path>-copy},
     * {@code -copy-2}, ...) under {@code title} (default: {@code <title> (copy)}). It is a create: the
     * allowance, the activity and the findings are a create's, and the original is untouched.
     */
    public DocService.Upserted duplicate(UUID accountId, UUID projectId, String path, String to, String title,
            Actor actor) {
        DocPageView source = docs.get(accountId, projectId, path);
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        List<DocTree.Node> roots = DocTree.build(treePages(projectId, accountId), nodes.list(projectId));
        List<String> templates = pages.listTemplates(projectId).stream().map(DocPageSummary::path).toList();
        String target = to == null || to.isBlank()
                ? freeCopyPath(roots, templates, source.path())
                : DocPage.normalizePath(to);
        if (DocTree.find(roots, target) != null || templates.contains(target)) {
            throw new DocPathTakenException(List.of(target));
        }
        String copyTitle = title != null && !title.isBlank() ? title : copyTitle(source.title());
        // A draft's copy stays a draft: duplicating must not publish what its author kept unpublished. A
        // template's copy stays a template (JAVA-801), and a template is never a draft.
        DocService.Upserted created = source.template()
                ? docs.upsert(accountId, projectId, target, copyTitle, source.body(), null, null, null,
                        new DocTemplates.Request(true, null, null), actor)
                : docs.upsert(accountId, projectId, target, copyTitle, source.body(), null,
                        source.publishedAt() == null, actor);
        DocTree.Node original = DocTree.find(roots, source.path());
        if (original != null && (original.icon() != null || original.iconColor() != null || original.fullWidth()
                || original.position() != null)) {
            Integer place = original.position() != null && Objects.equals(parentOf(source.path()), parentOf(target))
                    ? original.position() + 1
                    : null;
            tree.updateNode(accountId, projectId, target, original.icon(), original.iconColor(), null, place,
                    original.fullWidth(), null, actor);
        }
        return created;
    }

    /** The pages whose links name the page at {@code path}, or a path that redirects to it. */
    public Backlinks backlinks(UUID accountId, UUID projectId, String path) {
        DocPageView page = docs.get(accountId, projectId, path);
        if (page.builtin()) {
            return new Backlinks(page.path(), page.redirectedFrom(), List.of());
        }
        return new Backlinks(page.path(), page.redirectedFrom(),
                links.backlinks(projectId, accountId, page.id(), page.path())
                        .stream().map(DocPageView.Summary::of).toList());
    }

    /**
     * The tree's pages, the archived ones and the templates: each still holds its path, so a move takes it along. A
     * template under a moved collection moves with it (JAVA-801); {@link DocTree} never shows one.
     */
    private List<DocPageSummary> treePages(UUID projectId, UUID accountId) {
        List<DocPageSummary> all = new ArrayList<>(pages.list(projectId, accountId));
        all.addAll(pages.listArchived(projectId));
        all.addAll(pages.listTemplates(projectId));
        return all;
    }

    /** The {@code wanted} paths a template already holds, one this move does not take along (JAVA-801). */
    private List<String> templatesAt(UUID projectId, List<String> wanted, List<DocMove.Moved> moving) {
        return pages.listTemplates(projectId).stream().map(DocPageSummary::path)
                .filter(path -> wanted.stream().anyMatch(to -> DocMove.isAtOrUnder(to, path)))
                .filter(path -> moving.stream().noneMatch(m -> m.from().equals(path))).toList();
    }

    private List<DocNode> rowsAfter(UUID projectId, String from, String target, Integer position,
            List<DocTree.Node> roots, List<DocNode> rows, Instant now) {
        String newParent = parentOf(target);
        boolean sameParent = Objects.equals(parentOf(from), newParent);
        DocTree.Node parent = newParent == null ? null : DocTree.find(roots, newParent);
        if (position != null && parent != null && parent.sortMode() == DocSortMode.ALPHABETICAL) {
            throw OfficiumException.conflict("doc_sorted_alphabetically",
                    "\"" + parent.path() + "\" is sorted A-Z: switch it to manual to place its pages");
        }
        List<DocNode> after = new ArrayList<>();
        DocNode rootRow = null;
        for (DocNode row : rows) {
            if (DocMove.isAtOrUnder(row.path(), from)) {
                String mapped = DocMove.map(row.path(), from, target);
                boolean isRoot = row.path().equals(from);
                Integer kept = isRoot && !sameParent ? null : row.position();
                DocNode moved = new DocNode(projectId, mapped, row.icon(), row.iconColor(), row.sortMode(), kept,
                        row.version() + 1, now, row.fullWidth());
                if (isRoot) {
                    rootRow = moved;
                } else {
                    after.add(moved);
                }
            }
        }
        if (position == null) {
            if (rootRow != null) {
                after.add(rootRow);
            }
            return after;
        }
        List<String> order = new ArrayList<>((newParent == null
                ? roots
                : parent == null
                        ? List.<DocTree.Node>of()
                        : parent.children())
                .stream().map(DocTree.Node::path).toList());
        order.remove(from);
        order.add(Math.max(0, Math.min(position, order.size())), target);
        for (int i = 0; i < order.size(); i++) {
            String sibling = order.get(i);
            if (sibling.equals(target)) {
                after.add(rootRow == null
                        ? new DocNode(projectId, target, null, null, DocSortMode.MANUAL, i, 1, now, false)
                        : new DocNode(projectId, target, rootRow.icon(), rootRow.iconColor(), rootRow.sortMode(), i,
                                rootRow.version(), now, rootRow.fullWidth()));
                continue;
            }
            DocNode existing = rows.stream().filter(row -> row.path().equals(sibling)).findFirst().orElse(null);
            after.add(existing == null
                    ? new DocNode(projectId, sibling, null, null, DocSortMode.MANUAL, i, 1, now, false)
                    : existing.withPosition(i, now));
        }
        return after;
    }

    private String freeCopyPath(List<DocTree.Node> roots, List<String> templates, String path) {
        String candidate = path + "-copy";
        for (int n = 2; DocTree.find(roots, candidate) != null || templates.contains(candidate); n++) {
            candidate = path + "-copy-" + n;
        }
        return candidate;
    }

    private static String copyTitle(String title) {
        String suffix = " (copy)";
        String base = title.length() + suffix.length() > DocPage.MAX_TITLE_LENGTH
                ? title.substring(0, DocPage.MAX_TITLE_LENGTH - suffix.length())
                : title;
        return base + suffix;
    }

    private static String parentOf(String path) {
        int slash = path.lastIndexOf('/');
        return slash < 0 ? null : path.substring(0, slash);
    }
}
