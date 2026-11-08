package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** JAVA-792: which pages a move takes, and what it refuses. */
class DocMoveTest {

    private static final List<String> PAGES = List.of("a", "a/b", "a/b/c", "ab", "z");

    private static void refuses(String path, String to, String code) {
        assertThatThrownBy(() -> DocMove.plan(path, to, PAGES)).isInstanceOfSatisfying(OfficiumException.class,
                e -> assertThat(e.code()).isEqualTo(code));
    }

    @Test
    void movesThePageAndEverythingUnderItButNotAPrefixNeighbor() {
        var moved = DocMove.plan("a", "x/y", PAGES);
        assertThat(moved).containsExactly(new DocMove.Moved("a", "x/y"), new DocMove.Moved("a/b", "x/y/b"),
                new DocMove.Moved("a/b/c", "x/y/b/c"));
    }

    @Test
    void aNodeWithNoPageOfItsOwnStillMovesItsPages() {
        assertThat(DocMove.plan("a/b", "q", PAGES)).containsExactly(new DocMove.Moved("a/b", "q"),
                new DocMove.Moved("a/b/c", "q/c"));
    }

    @Test
    void refusesTheSamePathAndAMoveIntoItself() {
        refuses("a", "a", "doc_move_same_path");
        refuses("a", "a/b", "doc_move_into_itself");
    }

    @Test
    void refusesBuiltinsOnEitherSideAndReservedTargets() {
        refuses("officium/x", "q", "builtin_doc_read_only");
        refuses("a", "officium/q", "builtin_doc_read_only");
        refuses("a", "documentation/changelog", "reserved_doc_path");
        refuses("a", "documentation/test-history", "reserved_doc_path");
    }

    @Test
    void refusesWhenAMovedPathWouldPassEightSegments() {
        refuses("a", "1/2/3/4/5/6/7/8/9", "invalid_doc_path");
        refuses("a", "1/2/3/4/5/6/7", "invalid_doc_path");
        refuses("a", "x".repeat(201), "invalid_doc_path");
    }

    @Test
    void mapsPathsAtAndUnderTheSource() {
        assertThat(DocMove.map("a", "a", "q")).isEqualTo("q");
        assertThat(DocMove.map("a/b", "a", "q/r")).isEqualTo("q/r/b");
        assertThat(DocMove.isAtOrUnder("a/b", "a")).isTrue();
        assertThat(DocMove.isAtOrUnder("ab", "a")).isFalse();
    }
}
