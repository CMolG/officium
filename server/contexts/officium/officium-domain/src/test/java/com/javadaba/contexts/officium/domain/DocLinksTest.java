package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** JAVA-792: what counts as a reference to another page. */
class DocLinksTest {

    private static java.util.List<String> paths(String page, String body) {
        return DocLinks.extract(page, body).stream().map(DocLinks.Ref::path).toList();
    }

    @Test
    void readsDocReferencesInProseAndInInlineCodeWithTheirLine() {
        var refs = DocLinks.extract("p", "See doc://a/b and `doc://c`.\n\nAnd doc://a/b again.\n");
        assertThat(refs).containsExactly(new DocLinks.Ref("a/b", 1), new DocLinks.Ref("c", 1));
    }

    @Test
    void dropsAnchorsSectionsAndTheMdSuffix() {
        assertThat(paths("p", "doc://a/b§8.1 doc://c#top doc://d.md doc://e/f.")).containsExactly("a/b", "c", "d",
                "e/f");
    }

    @Test
    void aPlaceholderAndAFencedBlockAreNotReferences() {
        String body = "Use doc://<path> here.\n```text\ndoc://hidden\n```\n~~~\ndoc://hidden2\n~~~\ndoc://shown\n";
        assertThat(paths("p", body)).containsExactly("shown");
    }

    @Test
    void resolvesRelativeMarkdownLinksAgainstThePagesFolder() {
        String body = "[x](./sibling.md) [y](../up/other.md#h) [z](https://e.com/a.md) [w](#frag) [v](doc://d/e)";
        assertThat(paths("f/g/page", body)).containsExactlyInAnyOrder("f/g/sibling", "f/up/other", "d/e");
    }

    @Test
    void readsFrontmatterRelatedEntriesInBothShapes() {
        String body = "---\ntitle: T\nrelated:\n  - ./manage.md\n  - doc://x/y\n  - https://out.example\n---\n# T\n";
        assertThat(DocLinks.extract("f/page", body)).containsExactly(new DocLinks.Ref("f/manage", 4),
                new DocLinks.Ref("x/y", 5));
        assertThat(paths("f/page", "---\nrelated: [./a.md, doc://b]\n---\ntext")).containsExactly("f/a", "b");
    }

    @Test
    void aPageDoesNotReferenceItselfAndEachTargetCountsOnce() {
        assertThat(paths("a", "doc://a doc://b doc://b")).containsExactly("b");
    }
}
