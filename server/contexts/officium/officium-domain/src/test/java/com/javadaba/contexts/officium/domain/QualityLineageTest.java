package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1525: the lineage a corrective card states, and the closed rule vocabulary it states it with. */
class QualityLineageTest {

    private static final String SNAKE = """
            The snake effect stutters on a phone.

            - **Caused by:** `JAVA-1420` (the snake card)
            - Escaped in: review
            - Quality dimension: ux_and_polish
            - Violated rules: `ux_and_polish:unpolished-interaction`, clean_code:high-complexity
            """;

    @Test
    void aCompleteLineageIsReadFromItsFourLinesInAnyMarkdownDress() {
        QualityLineage lineage = QualityLineage.parse(SNAKE).orElseThrow();

        assertThat(lineage.causedBy()).isEqualTo("JAVA-1420");
        assertThat(lineage.namesCard()).isTrue();
        assertThat(lineage.escapedIn()).isEqualTo(EscapedPhase.REVIEW);
        assertThat(lineage.dimension()).isEqualTo(QualityDimension.UX_AND_POLISH);
        assertThat(QualityRule.ids(lineage.rules()))
                .containsExactly("ux_and_polish:unpolished-interaction", "clean_code:high-complexity");
    }

    @Test
    void legacyNamesNoCardAndNeedsNoOtherLine() {
        QualityLineage lineage = QualityLineage.parse("Caused by: legacy").orElseThrow();

        assertThat(lineage.namesCard()).isFalse();
        assertThat(QualityLineage.problems(QualityLineage.lines("Caused by: legacy"), true)).isEmpty();
    }

    @Test
    void noneIsAFunctionalFailureWithNoRule() {
        QualityLineage lineage = QualityLineage.parse("""
                Caused by: JAVA-7
                Escaped in: action
                Quality dimension: functional
                Violated rules: none
                """).orElseThrow();

        assertThat(lineage.dimension()).isEqualTo(QualityDimension.FUNCTIONAL);
        assertThat(lineage.rules()).isEmpty();
    }

    @Test
    void anOptionalLineageWithNoCausedByNeedsNothingAndARequiredOneAsksForIt() {
        QualityLineage.Lines none = QualityLineage.lines("Just a refactor.");

        assertThat(QualityLineage.problems(none, false)).isEmpty();
        assertThat(QualityLineage.problems(none, true)).singleElement().asString()
                .contains("Caused by: <KEY>").contains("Caused by: legacy");
        assertThat(QualityLineage.parse("Just a refactor.")).isEmpty();
    }

    @Test
    void aNamedOriginAsksForEachMissingLineByName() {
        List<String> problems = QualityLineage.problems(QualityLineage.lines("Caused by: JAVA-1420"), true);

        assertThat(problems).hasSize(3);
        assertThat(String.join(" ", problems)).contains("Escaped in: refine | action | review")
                .contains("Quality dimension:").contains("Violated rules:");
    }

    @Test
    void valuesOutsideTheVocabularyAreNamed() {
        List<String> problems = QualityLineage.problems(QualityLineage.lines("""
                Caused by: JAVA-1420
                Escaped in: deploy
                Quality dimension: vibes
                Violated rules: architecture:layer-violation, clean_code:spaghetti
                """), true);

        assertThat(String.join(" ", problems)).contains("Escaped in:").contains("Quality dimension:")
                .contains("clean_code:spaghetti").doesNotContain("architecture:layer-violation,");
        assertThat(QualityLineage.problems(QualityLineage.lines("Caused by: the old header"), true))
                .singleElement().asString().contains("neither a card key nor `legacy`");
    }

    @Test
    void theVocabularyIsClosedAndEveryReviewedDimensionHasRules() {
        assertThat(QualityRule.vocabulary()).containsOnlyKeys("architecture", "clean_code", "testing_rigor",
                "ux_and_polish", "runtime_guardrails");
        assertThat(QualityRule.vocabulary().get("clean_code")).contains("solid-ocp-dip", "type-safety-bypass");
        assertThat(QualityRule.find("runtime_guardrails:n-plus-one-query")).isPresent();
        assertThat(QualityRule.find("functional:anything")).isEmpty();
        assertThat(QualityRule.find("layer-violation")).isEmpty();
        assertThatThrownBy(() -> QualityRule.parseAll(List.of("architecture:layer-violation", "ux:shiny")))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("quality_rule_unknown"))
                .hasMessageContaining("ux:shiny");
        assertThat(QualityRule.parseAll(List.of("architecture:layer-violation", " architecture:layer-violation ")))
                .hasSize(1);
    }
}
