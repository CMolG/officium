package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocNode;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.DocSortMode;
import com.javadaba.contexts.officium.domain.DocTree;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.DocNodeRepository;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The documentation tree's layout (JAVA-791, contract §8.17): collections, order, icon and colour of
 * the nodes, read as one tree and changed one node at a time. Both adapters call only this.
 *
 * <p>Layout rows are sparse (see {@link DocNode}); the tree itself is derived from the page paths by
 * {@link DocTree}, so a page write never has to touch this service.
 */
@ApplicationScoped
public class DocTreeService {

    private final DocPageRepository pages;
    private final DocNodeRepository nodes;
    private final BuiltinDocs builtins;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final Clock clock;

    @Inject
    public DocTreeService(DocPageRepository pages, DocNodeRepository nodes, BuiltinDocs builtins,
            ProjectAccessGuard guard, ActivityPublisher activity) {
        this(pages, nodes, builtins, guard, activity, Clock.systemUTC());
    }

    DocTreeService(DocPageRepository pages, DocNodeRepository nodes, BuiltinDocs builtins, ProjectAccessGuard guard,
            ActivityPublisher activity, Clock clock) {
        this.pages = pages;
        this.nodes = nodes;
        this.builtins = builtins;
        this.guard = guard;
        this.activity = activity;
        this.clock = clock;
    }

    public DocTreeView tree(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return new DocTreeView(builtins.all().stream().map(DocPageView.Summary::of).toList(),
                roots(projectId, accountId).stream().map(DocTreeView.Node::of).toList());
    }

    /** {@code created} tells REST to answer 201: the path became a collection with this write. */
    public record Updated(DocTreeView.Node node, boolean created) {
    }

    /**
     * Changes a node's layout. {@code null} keeps a field; an empty icon or colour clears it. A
     * {@code position} renumbers the whole sibling group, so the order is always 0..n-1 afterwards.
     * A node with no row takes {@code expectedVersion} 0 or none; one with a row takes its version.
     */
    public Updated updateNode(UUID accountId, UUID projectId, String path, String icon, String iconColor,
            String sortMode, Integer position, Integer expectedVersion, Actor actor) {
        return updateNode(accountId, projectId, path, icon, iconColor, sortMode, position, null, expectedVersion,
                actor);
    }

    /** As above, and {@code fullWidth} sets the page's width setting ({@code null} keeps it, JAVA-795). */
    public Updated updateNode(UUID accountId, UUID projectId, String path, String icon, String iconColor,
            String sortMode, Integer position, Boolean fullWidth, Integer expectedVersion, Actor actor) {
        String normalized = requireWritable(accountId, projectId, path);
        DocSortMode mode = sortMode == null ? null : DocSortMode.fromWire(sortMode);
        Instant now = Instant.now(clock);
        List<DocTree.Node> roots = roots(projectId, accountId);
        DocTree.Node shown = DocTree.find(roots, normalized);
        if (shown == null && DocNode.depth(normalized) > 1) {
            throw OfficiumException.notFound("doc_node_not_found", "No such node: put a page under it first");
        }
        DocNode row = nodes.find(projectId, normalized).orElse(null);
        int version = row == null ? 0 : row.version();
        if (expectedVersion != null ? expectedVersion != version : version > 0) {
            throw new DocNodeConflictException(nodeView(projectId, accountId, normalized));
        }
        boolean created = shown == null;
        DocNode fresh = created
                ? DocNode.collection(projectId, normalized, null, now).withVersion(0)
                : new DocNode(projectId, normalized, null, null, DocSortMode.MANUAL, null, 0, now, false);
        // A version-0 row is a person's star (JAVA-1476): the edit keeps its id and writes over it.
        DocNode base = row == null ? fresh : created ? fresh.withId(row.id()) : row;
        DocNode changed = base.changed(icon, iconColor, mode, null, fullWidth, now);
        Integer placed = position;
        if (placed == null && created) {
            placed = Integer.MAX_VALUE;
        }
        if (placed == null) {
            if (row == null ? !nodes.insert(changed) : !nodes.updateIfVersion(changed, version)) {
                throw new DocNodeConflictException(nodeView(projectId, accountId, normalized));
            }
        } else {
            reorder(projectId, normalized, roots, changed, placed, now);
        }
        if (created) {
            activity.record(projectId, null, null, actor, "doc.collection.created",
                    "Collection \"" + normalized + "\" created", now);
        }
        activity.publishDoc("doc.changed", projectId, normalized, null, actor, now);
        return new Updated(nodeView(projectId, accountId, normalized), created);
    }

    /** Deletes a node that has no page and nothing under it: the way back from a new collection. */
    public void deleteNode(UUID accountId, UUID projectId, String path, int expectedVersion, Actor actor) {
        String normalized = requireWritable(accountId, projectId, path);
        DocNode row = nodes.find(projectId, normalized)
                .orElseThrow(() -> OfficiumException.notFound("doc_node_not_found", "No such node"));
        DocTree.Node shown = DocTree.find(roots(projectId, accountId), normalized);
        if (shown != null && (shown.page() != null || !shown.children().isEmpty())) {
            throw OfficiumException.conflict("doc_node_not_empty",
                    "A node with a page or pages under it can't be deleted: delete or move them first");
        }
        if (row.version() != expectedVersion || !nodes.deleteIfVersion(projectId, normalized, expectedVersion)) {
            throw new DocNodeConflictException(nodeView(projectId, accountId, normalized));
        }
        Instant now = Instant.now(clock);
        if (DocNode.depth(normalized) == 1) {
            activity.record(projectId, null, null, actor, "doc.collection.deleted",
                    "Collection \"" + normalized + "\" deleted", now);
        }
        activity.publishDoc("doc.changed", projectId, normalized, null, actor, now);
    }

    private void reorder(UUID projectId, String path, List<DocTree.Node> roots, DocNode target, int position,
            Instant now) {
        DocTree.Node parent = path.contains("/") ? DocTree.find(roots, path.substring(0, path.lastIndexOf('/'))) : null;
        if (parent != null && parent.sortMode() == DocSortMode.ALPHABETICAL) {
            throw OfficiumException.conflict("doc_sorted_alphabetically",
                    "\"" + parent.path() + "\" is sorted A-Z: switch it to manual to place its pages");
        }
        List<String> order = new ArrayList<>(DocTree.siblingsOf(roots, path).stream().map(DocTree.Node::path).toList());
        order.remove(path);
        order.add(Math.max(0, Math.min(position, order.size())), path);
        List<DocNode> writes = new ArrayList<>();
        for (int i = 0; i < order.size(); i++) {
            String sibling = order.get(i);
            DocNode existing = sibling.equals(path) ? target : nodes.find(projectId, sibling).orElse(null);
            if (existing == null) {
                writes.add(new DocNode(projectId, sibling, null, null, DocSortMode.MANUAL, i, 1, now, false));
            } else if (sibling.equals(path) || existing.position() == null || existing.position() != i) {
                writes.add(sibling.equals(path)
                        ? new DocNode(projectId, path, target.icon(), target.iconColor(), target.sortMode(), i,
                                target.version(), now, target.fullWidth(), target.id())
                        : existing.withPosition(i, now));
            }
        }
        nodes.upsertAll(writes);
    }

    /** The tree {@code accountId} sees: published pages and their own unpublished drafts, never the
     *  archive or the trash (JAVA-793). A node's layout row is shared; which pages fill it is per reader. */
    private List<DocTree.Node> roots(UUID projectId, UUID accountId) {
        return DocTree.build(pages.list(projectId, accountId), nodes.list(projectId));
    }

    private DocTreeView.Node nodeView(UUID projectId, UUID accountId, String path) {
        DocTree.Node node = DocTree.find(roots(projectId, accountId), path);
        if (node != null) {
            return DocTreeView.Node.of(node);
        }
        DocNode row = nodes.find(projectId, path)
                .orElseThrow(() -> OfficiumException.notFound("doc_node_not_found", "No such node"));
        return DocTreeView.Node.of(new DocTree.Node(path, path.substring(path.lastIndexOf('/') + 1),
                DocNode.depth(path), path, row.icon(), row.iconColor(), row.sortMode(), row.position(), row.version(),
                row.fullWidth(),
                null, List.of()));
    }

    private String requireWritable(UUID accountId, UUID projectId, String path) {
        guard.requireAccess(projectId, accountId);
        String normalized = DocPage.normalizePath(path);
        if (DocPage.isBuiltin(normalized)) {
            throw OfficiumException.forbidden("builtin_doc_read_only", "Pages under \"" + DocPage.BUILTIN_PREFIX
                    + "/\" are Officium's own documentation, pinned on top: nobody can arrange them.");
        }
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        return normalized;
    }
}
