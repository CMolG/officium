package com.javadaba.contexts.officium.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class DocAttachmentTest {

    @ParameterizedTest
    @ValueSource(strings = {"a.png", "pasted-image-1700000000.png", "9", "report-v2.final.pdf"})
    void acceptsNamesTheServerWouldNotChange(String name) {
        assertThat(DocAttachment.validName(name)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "A.png", ".hidden", "-x", "a b.png", "a/b.png", "a..b.png", "日.png"})
    void refusesTheRest(String name) {
        assertThat(DocAttachment.validName(name)).isFalse();
        assertThatThrownBy(() -> DocAttachment.requireName(name)).isInstanceOf(OfficiumException.class);
    }

    @Test
    void refusesANameOverTheLimit() {
        assertThat(DocAttachment.validName("a".repeat(100))).isTrue();
        assertThat(DocAttachment.validName("a".repeat(101))).isFalse();
    }

    @Test
    void findsReferencesOutsideCodeOnly() {
        String body = """
                ![Diagram](doc://guides/deploy/_files/flow.png) and [the sheet](doc://data/_files/q3.csv).
                Written as code it keeps nothing: `doc://guides/deploy/_files/example.png`.

                ```
                ![x](doc://guides/deploy/_files/in-fence.png)
                ```
                See doc://guides/deploy/_files/end.png.
                """;
        assertThat(DocFileRefs.in(body)).containsExactlyInAnyOrder(
                new DocFileRefs.Ref("guides/deploy", "flow.png"), new DocFileRefs.Ref("data", "q3.csv"),
                new DocFileRefs.Ref("guides/deploy", "end.png"));
    }

    @Test
    void aBodyWithoutFilesHasNoReferences() {
        assertThat(DocFileRefs.in("plain text with doc://guides/deploy")).isEmpty();
        assertThat(DocFileRefs.in(null)).isEmpty();
    }

    @Test
    void anAttachmentImageIsNotRefusedAtImportButARemoteOneIs() {
        assertThat(DocImport.containsImage("![a](doc://guides/x/_files/a.png)")).isFalse();
        assertThat(DocImport.containsImage("![a](https://example.com/a.png)")).isTrue();
        assertThat(DocImport.containsImage("![a](a.png)")).isTrue();
    }

    private static DocAttachment attachment(UUID page, String name, Instant at) {
        return new DocAttachment(UUID.randomUUID(), UUID.randomUUID(), page, name, DocAttachment.Kind.IMAGE,
                "image/png", 10, 5, 1, 1, "x", null, at);
    }

    @Test
    void sweepsOnlyWhatIsUnreferencedAndPastItsGrace() {
        Instant now = Instant.parse("2026-10-13T12:00:00Z");
        UUID page = UUID.randomUUID();
        DocAttachment used = attachment(page, "used.png", now.minusSeconds(86_400));
        DocAttachment orphan = attachment(page, "orphan.png", now.minusSeconds(86_400));
        DocAttachment fresh = attachment(page, "fresh.png", now.minusSeconds(60));
        List<DocAttachment> garbage = DocAttachmentGarbage.of(List.of(used, orphan, fresh),
                Set.of(new DocAttachmentGarbage.Key(page, "used.png")), now);
        assertThat(garbage).containsExactly(orphan);
    }

    @Test
    void theLintFlagsAnImageThatIsNotOneOfThePagesFilesOrHasNoAlt() {
        String body = "![Flow](doc://guides/deploy/_files/flow.png)\n\n![Logo](https://example.com/a.png)\n\n![](doc://guides/deploy/_files/b.png)\n\nExample: `![x](https://example.com/c.png)`\n";
        List<DocLint.Finding> findings = DocLint.lint(body);
        assertThat(findings).filteredOn(f -> f.rule().startsWith("image."))
                .extracting(DocLint.Finding::rule, DocLint.Finding::line)
                .containsExactlyInAnyOrder(org.assertj.core.groups.Tuple.tuple("image.source", 3),
                        org.assertj.core.groups.Tuple.tuple("image.alt-missing", 5));
    }
}
