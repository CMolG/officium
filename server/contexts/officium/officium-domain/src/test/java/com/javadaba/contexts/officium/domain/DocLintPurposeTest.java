package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1763: a page holds one purpose: its H2s, its count and its length. */
class DocLintPurposeTest {

    private static final Set<String> RULES = Set.of("section.unknown", "section.count", "page.length",
            "section.length");

    /** A page with the given type (or none) and one section per argument. */
    private static String page(String type, String... sections) {
        return "---\ntitle: \"Purpose\"\ndescription: \"" + "d".repeat(130) + "\"\n"
                + (type == null ? "" : "type: " + type + "\n")
                + "status: stable\naudience:\n  - developer\nlast_updated: 2026-10-21\n---\n\n"
                + "# Purpose\n\nA lead.\n\n" + String.join("\n\n", sections) + "\n";
    }

    private static List<DocLint.Finding> purpose(String body) {
        return DocLint.lint(body).stream().filter(finding -> RULES.contains(finding.rule())).toList();
    }

    private static List<DocLint.Finding> rule(String body, String rule) {
        return purpose(body).stream().filter(finding -> finding.rule().equals(rule)).toList();
    }

    private static int lineOf(String body, String text) {
        String[] lines = body.split("\n", -1);
        for (int i = 0; i < lines.length; i++) {
            if (lines[i].equals(text)) {
                return i + 1;
            }
        }
        throw new AssertionError("no line " + text);
    }

    private static String[] parts(int count) {
        return IntStream.rangeClosed(1, count).mapToObj(i -> "## Part " + i + "\n\nText.").toArray(String[]::new);
    }

    static Stream<Arguments> capsPerType() {
        return Stream.of(Arguments.of("tutorial", 9), Arguments.of("how-to", 9), Arguments.of("reference", 7),
                Arguments.of("explanation", 5), Arguments.of(null, 9));
    }

    @Test
    void aFreeFormH2IsFlaggedOnItsLineAndNamed() {
        String body = page("how-to", "## Overview\n\nSome text.", "## Our history\n\nMore text.");

        List<DocLint.Finding> unknown = rule(body, "section.unknown");

        assertThat(unknown).hasSize(1);
        assertThat(unknown.get(0).line()).isEqualTo(lineOf(body, "## Our history"));
        assertThat(unknown.get(0).message()).contains("Our history");
    }

    @Test
    void aSchemaHeadingWithTrailingPunctuationIsNotUnknown() {
        String body = page("how-to", "## Steps:\n\n1. Run it.\n2. Check it.", "## Next steps\n\n- Read more.");

        assertThat(rule(body, "section.unknown")).isEmpty();
    }

    @Test
    void anEmptyH2IsUnknown() {
        String body = page("how-to", "## \n\nText.");

        assertThat(rule(body, "section.unknown")).hasSize(1);
    }

    @Test
    void anH2InsideACodeBlockIsNotCounted() {
        String body = page("how-to", "```text\n## Not a heading\n```");

        assertThat(purpose(body)).isEmpty();
    }

    @ParameterizedTest(name = "{0} takes {1} sections")
    @MethodSource("capsPerType")
    void countPassesAtTheCapAndFlagsOneOver(String type, int cap) {
        String atCap = page(type, parts(cap));
        String overCap = page(type, parts(cap + 1));

        assertThat(rule(atCap, "section.count")).isEmpty();
        List<DocLint.Finding> count = rule(overCap, "section.count");
        assertThat(count).hasSize(1);
        assertThat(count.get(0).message()).contains("at most " + cap);
    }

    @Test
    void pageLengthAtTheLimitPassesAndOneMoreFlags() {
        List<String> lines = List.of("# T", "x".repeat(DocLintPurpose.MAX_PAGE_CHARS - 4));
        List<String> over = List.of("# T", "x".repeat(DocLintPurpose.MAX_PAGE_CHARS - 3));

        assertThat(DocLintPurpose.check(lines.toArray(String[]::new), List.of(), 0, "how-to")).isEmpty();
        assertThat(DocLintPurpose.check(over.toArray(String[]::new), List.of(), 0, "how-to"))
                .extracting(DocLint.Finding::rule).containsExactly("page.length");
    }

    @Test
    void pageLengthCountsCodePointsNotUtf16Units() {
        String[] lines = {"# T", "𝔘".repeat(DocLintPurpose.MAX_PAGE_CHARS - 4)};

        assertThat(DocLintPurpose.check(lines, List.of(), 0, "how-to")).isEmpty();
    }

    @Test
    void sectionLengthAtTheLimitPassesAndOneMoreFlags() {
        List<DocLintPurpose.Heading> headers = List.of(new DocLintPurpose.Heading(0, "Overview"));
        String[] atLimit = {"## Overview", "x".repeat(DocLintPurpose.MAX_SECTION_CHARS - 12)};
        String[] over = {"## Overview", "x".repeat(DocLintPurpose.MAX_SECTION_CHARS - 11)};

        assertThat(DocLintPurpose.check(atLimit, headers, 0, "how-to")).isEmpty();
        List<DocLint.Finding> flagged = DocLintPurpose.check(over, headers, 0, "how-to");
        assertThat(flagged).extracting(DocLint.Finding::rule).containsExactly("section.length");
        assertThat(flagged.get(0).message()).contains("Overview");
    }

    @Test
    void textBeforeTheFirstH2BelongsToNoSection() {
        String[] lines = {"x".repeat(DocLintPurpose.MAX_SECTION_CHARS), "## Overview", "x"};
        List<DocLintPurpose.Heading> headers = List.of(new DocLintPurpose.Heading(1, "Overview"));

        assertThat(DocLintPurpose.check(lines, headers, 0, "how-to")).isEmpty();
    }

    @Test
    void anOverviewShapedPageFlagsEachPartOnce() {
        String[] sections = new String[11];
        for (int i = 0; i < 10; i++) {
            sections[i] = "## Part " + (i + 1) + "\n\n" + "x".repeat(3_000);
        }
        sections[10] = "## Big\n\n" + "x".repeat(34_000);
        String body = page("how-to", sections);

        assertThat(rule(body, "section.unknown")).hasSize(11);
        assertThat(rule(body, "section.count")).hasSize(1);
        assertThat(rule(body, "page.length")).hasSize(1);
        List<DocLint.Finding> longSections = rule(body, "section.length");
        assertThat(longSections).hasSize(1);
        assertThat(longSections.get(0).line()).isEqualTo(lineOf(body, "## Big"));
    }
}
