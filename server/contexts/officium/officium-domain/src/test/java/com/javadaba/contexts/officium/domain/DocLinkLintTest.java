package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** JAVA-792: the two lint rules that need the project's pages. */
class DocLinkLintTest {

    private static java.util.List<DocLint.Finding> lint(String body) {
        return DocLinkLint.lint("p", body, Set.of("live"), Set.of("live", "folder"), Map.of("old", "live/new"));
    }

    @Test
    void aLiveLinkIsQuiet() {
        assertThat(lint("doc://live")).isEmpty();
    }

    @Test
    void aMovedPathIsRedirectedAndSaysWhereItLivesNow() {
        var findings = lint("x\ndoc://old/sub");
        assertThat(findings).hasSize(1);
        assertThat(findings.get(0).rule()).isEqualTo("link.redirected");
        assertThat(findings.get(0).line()).isEqualTo(2);
        assertThat(findings.get(0).message()).contains("doc://live/new/sub");
    }

    @Test
    void aMissingPageIsBrokenAndAFolderSaysSo() {
        assertThat(lint("doc://nowhere")).extracting(DocLint.Finding::rule).containsExactly("link.broken");
        assertThat(lint("doc://folder").get(0).message()).contains("no page of its own");
    }
}
