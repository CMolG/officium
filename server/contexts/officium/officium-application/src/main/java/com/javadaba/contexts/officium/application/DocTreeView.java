package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.DocTree;

import java.util.List;

/**
 * Wire shape of the documentation tree (JAVA-791, contract §8.17): Officium's own pages pinned on top
 * and the user's collections below. {@code version} 0 means the node has no layout row yet.
 */
public record DocTreeView(List<DocPageView.Summary> pinned, List<Node> collections) {

    public record Node(String path, String segment, int depth, String name, String icon, String iconColor,
            String sortMode, Integer position, int version, boolean fullWidth, DocPageView.Summary page,
            List<Node> children) {

        public static Node of(DocTree.Node node) {
            return new Node(node.path(), node.segment(), node.depth(), node.name(), node.icon(), node.iconColor(),
                    node.sortMode().wire(), node.position(), node.version(), node.fullWidth(),
                    node.page() == null ? null : DocPageView.Summary.of(node.page()),
                    node.children().stream().map(Node::of).toList());
        }
    }
}
