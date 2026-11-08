package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DocSearchQueryTest {

    @ParameterizedTest
    @ValueSource(strings = {"deploy", "officium-api", "DocService.upsert", "a - b", "-", "or",
            "contracts/officium-api"})
    void aTextWithNoOperatorIsPlain(String text) {
        assertThat(query(text).isPlain()).as(text).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"\"edit session\"", "a OR b", "docs -officium", "-word"})
    void aPhraseOrAnOrOrANegationIsNotPlain(String text) {
        assertThat(query(text).isPlain()).as(text).isFalse();
    }

    @ParameterizedTest
    @CsvSource({"'', text_required", "'   ', text_required"})
    void aBlankTextIsRefused(String text, String code) {
        assertThatThrownBy(() -> DocSearchQuery.of(text, null, null, null, null, null, null, null))
                .isInstanceOfSatisfying(OfficiumException.class, ex -> assertThat(ex.code()).isEqualTo(code));
    }

    @Test
    void everyInvalidFilterHasItsOwnCode() {
        assertCode("a/b", null, null, null, null, null, "invalid_doc_path");
        assertCode(null, "me", null, null, null, null, "invalid_author");
        assertCode(null, null, "yesterday", null, null, null, "invalid_updated_range");
        assertCode(null, null, "2026-10-02T00:00:00Z", "2026-10-01T00:00:00Z", null, null,
                "invalid_updated_range");
        assertCode(null, null, null, null, "trash", null, "invalid_doc_state");
        assertCode(null, null, null, null, null, 0, "invalid_limit");
        assertCode(null, null, null, null, null, 101, "invalid_limit");
    }

    @Test
    void validFiltersAreNormalized() {
        UUID author = UUID.randomUUID();
        DocSearchQuery query = DocSearchQuery.of("  deploy ", " Contracts ", author.toString(),
                "2026-10-01T00:00:00Z", "2026-10-02T00:00:00Z", " Archived ", 25, 50);

        assertThat(query.text()).isEqualTo("deploy");
        assertThat(query.collection()).isEqualTo("contracts");
        assertThat(query.author()).isEqualTo(author);
        assertThat(query.state()).isEqualTo("archived");
        assertThat(query.limit()).isEqualTo(25);
        assertThat(query.offset()).isEqualTo(50);
    }

    private static DocSearchQuery query(String text) {
        return DocSearchQuery.of(text, null, null, null, null, null, null, null);
    }

    private static void assertCode(String collection, String author, String after, String before,
            String state, Integer limit, String code) {
        assertThatThrownBy(() -> DocSearchQuery.of("deploy", collection, author, after, before, state, limit, null))
                .as(code).isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo(code));
    }
}
