package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** JAVA-791: what the documentation tree shows and the order it shows it in. */
class DocTreeTest {

    private static final UUID PROJECT = UUID.randomUUID();
    private static final Instant NOW = Instant.parse("2026-10-13T00:00:00Z");
    private static final Actor ACTOR = Actor.person(UUID.randomUUID(), "Ana");

    private static DocPageSummary page(String path, String title) {
        return new DocPageSummary(UUID.randomUUID(), path, title, 1, ACTOR, NOW);
    }

    private static DocNode row(String path, DocSortMode mode, Integer position) {
        return new DocNode(PROJECT, path, "folder", "slate", mode, position, 1, NOW, false);
    }

    private static List<String> paths(List<DocTree.Node> nodes) {
        return nodes.stream().map(DocTree.Node::path).toList();
    }

    @Test
    void everyPrefixOfAPageShowsEvenWithoutAPageOfItsOwn() {
        var tree = DocTree.build(List.of(page("a/b/c", "C")), List.of());
        assertThat(paths(tree)).containsExactly("a");
        assertThat(tree.get(0).page()).isNull();
        assertThat(tree.get(0).name()).isEqualTo("a");
        assertThat(paths(tree.get(0).children())).containsExactly("a/b");
        assertThat(paths(tree.get(0).children().get(0).children())).containsExactly("a/b/c");
    }

    @Test
    void aDepthOneRowShowsEmptyButADeeperRowWithNothingUnderItIsHidden() {
        var tree = DocTree.build(List.of(page("a/x", "X")), List.of(row("empty", DocSortMode.MANUAL, 0),
                row("a/ghost", DocSortMode.MANUAL, 0)));
        assertThat(paths(tree)).containsExactly("empty", "a");
        assertThat(paths(tree.get(1).children())).containsExactly("a/x");
    }

    @Test
    void manualPutsPositionedNodesFirstThenTheRestByName() {
        var pages = List.of(page("a", "A"), page("b", "B"), page("c", "C"), page("d", "D"));
        var tree = DocTree.build(pages, List.of(row("c", DocSortMode.MANUAL, 0), row("b", DocSortMode.MANUAL, 1)));
        assertThat(paths(tree)).containsExactly("c", "b", "a", "d");
    }

    @Test
    void alphabeticalIgnoresPositionsAndCaseAndUsesTheTitle() {
        var pages = List.of(page("p/one", "banana"), page("p/two", "Apple"), page("p/three", "cherry"));
        var tree = DocTree.build(pages, List.of(row("p", DocSortMode.ALPHABETICAL, 0),
                row("p/three", DocSortMode.MANUAL, 0)));
        assertThat(paths(tree.get(0).children())).containsExactly("p/two", "p/one", "p/three");
    }

    @Test
    void theRootIsAlwaysManual() {
        var tree = DocTree.build(List.of(page("b", "B"), page("a", "A")), List.of(row("b", DocSortMode.MANUAL, 0)));
        assertThat(paths(tree)).containsExactly("b", "a");
    }

    @Test
    void siblingsOfANestedPathAreItsParentsChildren() {
        var tree = DocTree.build(List.of(page("a/x", "X"), page("a/y", "Y")), List.of());
        assertThat(paths(DocTree.siblingsOf(tree, "a/y"))).containsExactly("a/x", "a/y");
        assertThat(paths(DocTree.siblingsOf(tree, "a"))).containsExactly("a");
        assertThat(DocTree.find(tree, "a/y").version()).isZero();
    }
}
