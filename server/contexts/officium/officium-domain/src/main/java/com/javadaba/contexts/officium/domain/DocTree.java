package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeSet;

/**
 * Builds the documentation tree from page paths and the sparse layout rows (JAVA-791, contract §8.17).
 *
 * <p>Shown: every page and each of its prefixes, plus every depth-1 row of version 1 or more, so an empty
 * collection shows (a version-0 row is only a person's star, JAVA-1476, and makes nothing show).
 * A row below depth 1 with no page and nothing under it is hidden. Siblings are ordered by their
 * parent's {@link DocSortMode}; the root is always manual. A template is never a node (JAVA-801): it is
 * listed in the Templates section, so a depth-1 template makes no collection either.
 */
public final class DocTree {

    /** One node of the tree; {@code version} 0 means it has no row. */
    public record Node(String path, String segment, int depth, String name, String icon, String iconColor,
            DocSortMode sortMode, Integer position, int version, boolean fullWidth, DocPageSummary page,
            List<Node> children) {
    }

    private DocTree() {
    }

    public static List<Node> build(List<DocPageSummary> pages, List<DocNode> rows) {
        Map<String, DocPageSummary> byPath = new HashMap<>();
        Map<String, DocNode> byRow = new HashMap<>();
        TreeSet<String> shown = new TreeSet<>();
        for (DocPageSummary page : pages) {
            if (page.template()) {
                continue;
            }
            byPath.put(page.path(), page);
            addWithPrefixes(shown, page.path());
        }
        for (DocNode row : rows) {
            byRow.put(row.path(), row);
            if (DocNode.depth(row.path()) == 1 && row.version() > 0) {
                shown.add(row.path());
            }
        }
        return childrenOf(null, DocSortMode.MANUAL, shown, byPath, byRow);
    }

    /** The shown siblings of the node at {@code path} (itself included), in order; empty if it isn't shown. */
    public static List<Node> siblingsOf(List<Node> roots, String path) {
        int slash = path.lastIndexOf('/');
        if (slash < 0) {
            return roots;
        }
        Node parent = find(roots, path.substring(0, slash));
        return parent == null ? List.of() : parent.children();
    }

    public static Node find(List<Node> roots, String path) {
        for (Node node : roots) {
            if (node.path().equals(path)) {
                return node;
            }
            if (path.startsWith(node.path() + "/")) {
                return find(node.children(), path);
            }
        }
        return null;
    }

    private static void addWithPrefixes(TreeSet<String> shown, String path) {
        int slash = path.indexOf('/');
        while (slash >= 0) {
            shown.add(path.substring(0, slash));
            slash = path.indexOf('/', slash + 1);
        }
        shown.add(path);
    }

    private static List<Node> childrenOf(String parent, DocSortMode mode, TreeSet<String> shown,
            Map<String, DocPageSummary> pages, Map<String, DocNode> rows) {
        List<Node> nodes = new ArrayList<>();
        for (String path : shown) {
            if (!isChild(parent, path)) {
                continue;
            }
            DocNode row = rows.get(path);
            DocPageSummary page = pages.get(path);
            DocSortMode own = row == null ? DocSortMode.MANUAL : row.sortMode();
            String segment = path.substring(path.lastIndexOf('/') + 1);
            nodes.add(new Node(path, segment, DocNode.depth(path), page == null ? segment : page.title(),
                    row == null ? null : row.icon(), row == null ? null : row.iconColor(), own,
                    row == null ? null : row.position(), row == null ? 0 : row.version(),
                    row != null && row.fullWidth(), page,
                    childrenOf(path, own, shown, pages, rows)));
        }
        nodes.sort(comparator(mode));
        return nodes;
    }

    private static boolean isChild(String parent, String path) {
        if (parent == null) {
            return path.indexOf('/') < 0;
        }
        return path.startsWith(parent + "/") && path.indexOf('/', parent.length() + 1) < 0;
    }

    private static Comparator<Node> comparator(DocSortMode mode) {
        Comparator<Node> byName = Comparator.comparing((Node n) -> n.name().toLowerCase(Locale.ROOT))
                .thenComparing(Node::name).thenComparing(Node::path);
        if (mode == DocSortMode.ALPHABETICAL) {
            return byName;
        }
        return Comparator.comparing((Node n) -> n.position() == null)
                .thenComparing(n -> n.position() == null ? 0 : n.position()).thenComparing(byName);
    }
}
