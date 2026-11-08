package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** JAVA-778: what a bulk import refuses as an image, and how long its code lives. */
class DocImportTest {

    @Test
    void aMarkdownOrHtmlImageIsRefused() {
        assertThat(DocImport.containsImage("Intro\n\n![the board](board.png)\n")).isTrue();
        assertThat(DocImport.containsImage("See ![logo][ref]\n\n[ref]: logo.svg")).isTrue();
        assertThat(DocImport.containsImage("Inline <IMG src=\"x.png\"> markup")).isTrue();
    }

    @Test
    void anImageWrittenAsCodeIsText() {
        assertThat(DocImport.containsImage("Every `<img>` carries an alt text.")).isFalse();
        assertThat(DocImport.containsImage("```html\n<img src=\"x.png\">\n![a](b.png)\n```\nAfter the block."))
                .isFalse();
        assertThat(DocImport.containsImage("~~~\n![a](b.png)\n~~~")).isFalse();
        assertThat(DocImport.containsImage("A [link](page.md) and a ! mark.")).isFalse();
        assertThat(DocImport.containsImage(null)).isFalse();
    }

    @Test
    void aCodeWorksUntilItLapsesOrIsClosed() {
        Instant now = Instant.parse("2026-10-02T08:00:00Z");
        DocImportCode open = new DocImportCode(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "h",
                now.plusSeconds(900), null, now);

        assertThat(open.usableAt(now.plusSeconds(899))).isTrue();
        assertThat(open.usableAt(now.plusSeconds(900))).isFalse();
        DocImportCode closed = new DocImportCode(open.id(), open.projectId(), open.accountId(), "h",
                open.expiresAt(), now.plusSeconds(60), now);
        assertThat(closed.usableAt(now.plusSeconds(61))).isFalse();
    }
}
