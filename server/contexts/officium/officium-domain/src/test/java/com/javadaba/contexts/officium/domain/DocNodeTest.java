package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** JAVA-791: what an icon, a colour and an edit of a node may be. */
class DocNodeTest {

    private static final Instant NOW = Instant.parse("2026-10-13T00:00:00Z");

    private static DocNode node() {
        return DocNode.collection(UUID.randomUUID(), "guides", 0, NOW);
    }

    @ParameterizedTest
    @ValueSource(strings = {"book-open", "folder", "file-text", "a1", "📚", "❤️", "🇪🇸", "1️⃣", "#️⃣", "*️⃣", "0️⃣"})
    void aLucideIdOrOneEmojiIsAnIcon(String icon) {
        assertThat(DocNode.requireIcon(icon)).isEqualTo(icon);
    }

    @ParameterizedTest
    @ValueSource(strings = {"Book", "book_open", "-a", "a-", "a--b", "<b>", "📚📚", "📚x", "🇪🇸🇫🇷",
            "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"})
    void anythingElseIsRefused(String icon) {
        assertThatThrownBy(() -> DocNode.requireIcon(icon)).isInstanceOfSatisfying(OfficiumException.class, ex -> {
            assertThat(ex.httpStatus()).isEqualTo(400);
            assertThat(ex.code()).isEqualTo("invalid_doc_icon");
        });
    }

    @Test
    void aColourIsOneOfThePalette() {
        assertThat(DocNode.requireColor("teal")).isEqualTo("teal");
        assertThatThrownBy(() -> DocNode.requireColor("#fff")).isInstanceOfSatisfying(OfficiumException.class,
                ex -> assertThat(ex.code()).isEqualTo("invalid_doc_color"));
    }

    @Test
    void nullKeepsAndEmptyClearsAndEveryChangeBumpsTheVersion() {
        DocNode changed = node().changed("book-open", "", DocSortMode.ALPHABETICAL, null, NOW);
        assertThat(changed.icon()).isEqualTo("book-open");
        assertThat(changed.iconColor()).isNull();
        assertThat(changed.sortMode()).isEqualTo(DocSortMode.ALPHABETICAL);
        assertThat(changed.position()).isZero();
        assertThat(changed.version()).isEqualTo(2);
        assertThat(node().changed("", null, null, 3, NOW).icon()).isNull();
    }

    @Test
    void anUnknownSortModeIsRefused() {
        assertThatThrownBy(() -> DocSortMode.fromWire("random")).isInstanceOfSatisfying(OfficiumException.class,
                ex -> assertThat(ex.code()).isEqualTo("invalid_sort_mode"));
    }

    @Test
    void depthCountsSegments() {
        assertThat(DocNode.depth("a")).isEqualTo(1);
        assertThat(DocNode.depth("a/b/c")).isEqualTo(3);
    }
}
