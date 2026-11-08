package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.DocNode;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.DocPageSummary;
import com.javadaba.contexts.officium.domain.DocSortMode;
import com.javadaba.contexts.officium.domain.DocStars;
import com.javadaba.contexts.officium.domain.DocStars.Target;
import com.javadaba.contexts.officium.domain.DocTree;
import com.javadaba.contexts.officium.domain.DocViews;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.ports.DocNodeRepository;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import com.javadaba.contexts.officium.domain.ports.DocStarRepository;
import com.javadaba.contexts.officium.domain.ports.DocViewRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * A person's own way through the documentation (JAVA-799, contract §8.21): what they starred and
 * what they opened last. Both belong to the caller alone, any member (a viewer too) has them, and
 * nobody reads another person's. Both adapters call only this.
 *
 * <p>An entry is listed only while its page can be read by the caller (published, archived, or their
 * own draft): a page in the trash keeps its star and its view, hidden, so a restore brings them back.
 */
@ApplicationScoped
public class DocStarService {

    private final DocPageRepository pages;
    private final DocNodeRepository nodes;
    private final DocStarRepository stars;
    private final DocViewRepository views;
    private final ProjectAccessGuard guard;
    private final Clock clock;

    @Inject
    public DocStarService(DocPageRepository pages, DocNodeRepository nodes, DocStarRepository stars,
            DocViewRepository views, ProjectAccessGuard guard) {
        this(pages, nodes, stars, views, guard, Clock.systemUTC());
    }

    DocStarService(DocPageRepository pages, DocNodeRepository nodes, DocStarRepository stars,
            DocViewRepository views, ProjectAccessGuard guard, Clock clock) {
        this.pages = pages;
        this.nodes = nodes;
        this.stars = stars;
        this.views = views;
        this.guard = guard;
        this.clock = clock;
    }

    /** {@code created} tells REST to answer 201: this write made the star. */
    public record Starred(DocStarView star, boolean created) {
    }

    public List<DocStarView> starred(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        Readable readable = readable(projectId, accountId);
        List<DocStarView> listed = new ArrayList<>();
        for (Target target : stars.list(projectId, accountId)) {
            DocStarView view = readable.view(target, listed.size());
            if (view != null) {
                listed.add(view);
            }
        }
        return listed;
    }

    /**
     * Stars a page, or with {@code kind} {@code collection} a depth-1 node. Starring again keeps the
     * place unless a {@code position} moves it: 0-based, an index among the stars the caller sees.
     */
    public Starred star(UUID accountId, UUID projectId, String path, String kind, Integer position) {
        guard.requireAccess(projectId, accountId);
        DocStars.Kind which = DocStars.Kind.fromWire(kind);
        String normalized = requireNotBuiltin(path);
        Target target = which == DocStars.Kind.PAGE
                ? Target.page(requirePage(projectId, accountId, normalized).id())
                : Target.collection(requireCollection(projectId, accountId, normalized).id());
        Readable readable = readable(projectId, accountId);
        DocStarRepository.Change change = stars.update(projectId, accountId,
                before -> DocStars.place(before, target, position, readable::lists));
        int listedIndex = change.after().stream().filter(readable::lists).toList().indexOf(target);
        return new Starred(readable.view(target, listedIndex), !change.before().contains(target));
    }

    /**
     * Removes a star; {@code false} when there was none. Idempotent, and it never needs the page: a
     * star outlives a page that was trashed, or whose path now holds somebody else's draft.
     */
    public boolean unstar(UUID accountId, UUID projectId, String path, String kind) {
        guard.requireAccess(projectId, accountId);
        DocStars.Kind which = DocStars.Kind.fromWire(kind);
        String normalized = requireNotBuiltin(path);
        Set<Target> doomed = new HashSet<>();
        if (which == DocStars.Kind.PAGE) {
            pages.find(projectId, normalized).ifPresent(page -> doomed.add(Target.page(page.id())));
            for (Target starred : stars.list(projectId, accountId)) {
                if (starred.pageId() != null && pages.findTrashed(projectId, starred.pageId())
                        .filter(page -> page.path().equals(normalized)).isPresent()) {
                    doomed.add(starred);
                }
            }
        } else {
            nodes.find(projectId, normalized).filter(row -> row.id() != null)
                    .ifPresent(row -> doomed.add(Target.collection(row.id())));
        }
        DocStarRepository.Change change = stars.update(projectId, accountId, before -> {
            List<Target> after = new ArrayList<>(before);
            after.removeAll(doomed);
            return after;
        });
        return !change.after().equals(change.before());
    }

    /** The pages the caller opened last, newest first, at most {@code limit} (and never more than 50). */
    public List<DocRecentView> recent(UUID accountId, UUID projectId, Integer limit) {
        guard.requireAccess(projectId, accountId);
        Readable readable = readable(projectId, accountId);
        List<DocRecentView> listed = new ArrayList<>();
        for (DocViewRepository.View view : views.recent(projectId, accountId, DocViews.KEEP)) {
            DocPageSummary page = readable.pagesById.get(view.pageId());
            if (page != null) {
                listed.add(new DocRecentView(DocPageView.Summary.of(page), view.viewedAt()));
            }
        }
        return listed.subList(0, Math.min(listed.size(), DocViews.limit(limit)));
    }

    /**
     * Records that the caller opened the page. The web does it when a page opens; reading through
     * {@code docs.get} records nothing, because an agent acts as its person's account and its reads
     * would fill their Recent. {@code false}: nothing to record (one of Officium's own pages).
     */
    public boolean view(UUID accountId, UUID projectId, String path) {
        guard.requireAccess(projectId, accountId);
        String normalized = DocPage.normalizePath(path);
        if (DocPage.isBuiltin(normalized)) {
            return false;
        }
        DocPage page = requirePage(projectId, accountId, normalized);
        views.record(projectId, accountId, page.id(), Instant.now(clock), DocViews.KEEP);
        return true;
    }

    private String requireNotBuiltin(String path) {
        String normalized = DocPage.normalizePath(path);
        if (DocPage.isBuiltin(normalized)) {
            throw OfficiumException.forbidden("builtin_doc_read_only", "Pages under \"" + DocPage.BUILTIN_PREFIX
                    + "/\" are Officium's own documentation, pinned on top: they can't be starred.");
        }
        return normalized;
    }

    private DocPage requirePage(UUID projectId, UUID accountId, String path) {
        return pages.find(projectId, path).filter(page -> page.visibleTo(accountId))
                .orElseThrow(() -> OfficiumException.notFound("doc_not_found", "No such page"));
    }

    /**
     * The depth-1 node's row, written now when the collection only exists through its pages. A star is a
     * person's own, so the row it needs is neutral: version 0 ("no row yet"), no icon, no colour, no
     * place. It changes nothing anyone else sees, and an editor's first PATCH still expects version 0.
     */
    private DocNode requireCollection(UUID projectId, UUID accountId, String path) {
        if (DocNode.depth(path) != 1) {
            throw OfficiumException.badRequest("not_a_collection",
                    "Only a collection (a first path segment) can be starred as one: star the page instead");
        }
        if (DocTree.find(DocTree.build(pages.list(projectId, accountId), nodes.list(projectId)), path) == null) {
            throw OfficiumException.notFound("doc_node_not_found", "No such collection");
        }
        DocNode row = nodes.find(projectId, path).orElse(null);
        if (row == null) {
            nodes.insert(new DocNode(projectId, path, null, null, DocSortMode.MANUAL, null, 0, Instant.now(clock),
                    false, UUID.randomUUID()));
            row = nodes.find(projectId, path)
                    .orElseThrow(() -> OfficiumException.notFound("doc_node_not_found", "No such collection"));
        }
        return row;
    }

    private Readable readable(UUID projectId, UUID accountId) {
        List<DocPageSummary> inTree = pages.list(projectId, accountId);
        List<DocPageSummary> readable = new ArrayList<>(inTree);
        readable.addAll(pages.listArchived(projectId));
        List<DocNode> rows = nodes.list(projectId);
        return new Readable(readable, rows, DocTree.build(inTree, rows));
    }

    /** What the caller can read right now, indexed for the two lookups an entry needs. */
    private static final class Readable {
        private final Map<UUID, DocPageSummary> pagesById = new HashMap<>();
        private final Map<UUID, DocNode> nodesById = new HashMap<>();
        private final Map<String, DocNode> nodesByPath = new HashMap<>();
        private final List<DocTree.Node> roots;

        private Readable(List<DocPageSummary> pages, List<DocNode> rows, List<DocTree.Node> roots) {
            pages.forEach(page -> pagesById.put(page.id(), page));
            rows.forEach(row -> {
                nodesByPath.put(row.path(), row);
                if (row.id() != null) {
                    nodesById.put(row.id(), row);
                }
            });
            this.roots = roots;
        }

        private boolean lists(Target target) {
            return view(target, 0) != null;
        }

        private DocStarView view(Target target, int position) {
            if (target.pageId() != null) {
                DocPageSummary page = pagesById.get(target.pageId());
                if (page == null) {
                    return null;
                }
                DocNode row = nodesByPath.get(page.path());
                return new DocStarView(target.kind(), page.path(), page.title(), row == null ? null : row.icon(),
                        row == null ? null : row.iconColor(), position, DocPageView.Summary.of(page));
            }
            DocNode row = nodesById.get(target.nodeId());
            DocTree.Node node = row == null ? null : DocTree.find(roots, row.path());
            if (node == null) {
                return null;
            }
            return new DocStarView(target.kind(), node.path(), node.name(), row.icon(), row.iconColor(), position,
                    node.page() == null ? null : DocPageView.Summary.of(node.page()));
        }
    }
}
