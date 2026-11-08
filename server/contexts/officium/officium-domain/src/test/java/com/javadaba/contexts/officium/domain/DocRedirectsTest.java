package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/** JAVA-792: how an old path finds its page. */
class DocRedirectsTest {

    @Test
    void candidatesAreThePathAndItsAncestorsLongestFirst() {
        assertThat(DocRedirects.candidates("a/b/c")).containsExactly("a/b/c", "a/b", "a");
    }

    @Test
    void anExactRowAnswersTheCurrentPath() {
        var hit = DocRedirects.resolve("old", Map.of("old", "new/home"), p -> true);
        assertThat(hit).contains(new DocRedirects.Hit("new/home", "old"));
    }

    @Test
    void aPrefixRowAnswersAnythingUnderItAndKeepsTheRemainder() {
        var hit = DocRedirects.resolve("old/_files/x.png", Map.of("old", "new"), p -> true);
        assertThat(hit).contains(new DocRedirects.Hit("new/_files/x.png", "old/_files/x.png"));
    }

    @Test
    void theLongestRowWins() {
        var rows = Map.of("a", "x", "a/b", "y");
        assertThat(DocRedirects.resolve("a/b/c", rows, p -> true).orElseThrow().path()).isEqualTo("y/c");
    }

    @Test
    void aChainResolvesThroughTheRowsPageNotThroughOtherRows() {
        var rows = Map.of("a", "y", "x", "y");
        assertThat(DocRedirects.resolve("a", rows, p -> true).orElseThrow().path()).isEqualTo("y");
    }

    @Test
    void anUnreadableTargetAnswersNothing() {
        assertThat(DocRedirects.resolve("old", Map.of("old", "secret"), p -> false)).isEqualTo(Optional.empty());
        assertThat(DocRedirects.resolve("none", Map.of("old", "new"), p -> true)).isEmpty();
    }
}
