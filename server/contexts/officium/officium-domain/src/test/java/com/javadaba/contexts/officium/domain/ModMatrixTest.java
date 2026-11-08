package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1569: the mods a work profile mounts on a matrix cell, and what a role follows of them. */
class ModMatrixTest {

    private static final ModRules CATALOG = new ModRules(
            Map.of("code-reviewer", List.of("rule-enforcer"), "acceptance-qa", List.of("rule-enforcer")),
            Map.of("dry-run", Set.of("rule-enforcer"), "rule-enforcer", Set.of("dry-run")));

    private static RoleMatrix withMods(Map<String, Map<String, List<String>>> rows) {
        return RoleMatrix.fromWire(null, null, null, rows);
    }

    @Test
    void aCellMountsItsModsOnEveryRoleOfTheCellAndTheSignalsAddTheirOwn() {
        RoleMatrix matrix = RoleMatrix.defaults().overlay(withMods(Map.of(
                "bug", Map.of("review", List.of("a11y-enforcer", "dark-mode")),
                "touches-ui", Map.of("review", List.of("dark-mode", "cognitive-ux")))));

        assertThat(matrix.cellMods(Category.BUG, null, Status.REVIEW, List.of(Signal.TOUCHES_UI)))
                .containsExactly("a11y-enforcer", "dark-mode", "cognitive-ux");
        assertThat(matrix.cellMods(Category.BUG, null, Status.REVIEW, List.of()))
                .containsExactly("a11y-enforcer", "dark-mode");
        assertThat(matrix.cellMods(Category.BUG, null, Status.DOING, List.of())).isEmpty();
        assertThat(matrix.cellMods(Category.BUG, null, Status.DONE, List.of(Signal.TOUCHES_UI))).isEmpty();
    }

    @Test
    void aRoleFollowsItsRequiredModsFirstThenTheCellsAndEachModOnce() {
        RoleMatrix matrix = RoleMatrix.defaults()
                .overlay(withMods(Map.of("bug", Map.of("review", List.of("dark-mode", "rule-enforcer")))));

        Map<String, List<String>> byRole = matrix.modsByRole(Category.BUG, null, Status.REVIEW, List.of(), CATALOG,
                warning -> {
                });

        assertThat(byRole.get("code-reviewer")).containsExactly("rule-enforcer", "dark-mode");
        assertThat(byRole.get("acceptance-qa")).containsExactly("rule-enforcer", "dark-mode");
    }

    @Test
    void aRoleWithNoModsIsAbsentAndARequiredModNeedsNoCell() {
        Map<String, List<String>> byRole = RoleMatrix.defaults().modsByRole(Category.BUG, null, Status.REVIEW,
                List.of(), CATALOG, warning -> {
                });

        assertThat(byRole).containsOnlyKeys("code-reviewer", "acceptance-qa");
        assertThat(byRole.get("code-reviewer")).containsExactly("rule-enforcer");
        assertThat(RoleMatrix.defaults().modsByRole(Category.BUG, null, Status.TODO, List.of(), CATALOG,
                warning -> {
                })).isEmpty();
    }

    @Test
    void aCellModThatExcludesTheFloorIsDroppedWithAWarning() {
        RoleMatrix matrix = RoleMatrix.defaults()
                .overlay(withMods(Map.of("bug", Map.of("review", List.of("dry-run", "dark-mode")))));
        List<String> warnings = new ArrayList<>();

        Map<String, List<String>> byRole = matrix.modsByRole(Category.BUG, null, Status.REVIEW, List.of(), CATALOG,
                warnings::add);

        assertThat(byRole.get("code-reviewer")).containsExactly("rule-enforcer", "dark-mode");
        assertThat(warnings).hasSize(2).allMatch(w -> w.contains("dry-run") && w.contains("rule-enforcer"));
    }

    @Test
    void anOverlayReplacesTheCellsItNamesWholeAndAnEmptyOneClears() {
        ModMatrix base = ModMatrix.fromWire(Map.of("bug", Map.of("review", List.of("a", "b"), "action", List.of("c"))));
        ModMatrix over = ModMatrix.fromWire(Map.of("bug", Map.of("review", List.of("d"), "action", List.of())));

        ModMatrix merged = base.overlay(over);

        assertThat(merged.cell("bug", Phase.REVIEW)).containsExactly("d");
        assertThat(merged.cell("bug", Phase.ACTION)).isEmpty();
    }

    @Test
    void theWireShapeRoundTripsAndAnOldMatrixWithoutModsReadsEmpty() {
        RoleMatrix matrix = withMods(Map.of("feature", Map.of("review", List.of("rule-enforcer")),
                "touches-data-schema", Map.of("action", List.of("db-migrations-safe"))));

        assertThat(matrix.toWire().get("mods")).isEqualTo(Map.of(
                "feature", Map.of("review", List.of("rule-enforcer")),
                "touches-data-schema", Map.of("action", List.of("db-migrations-safe"))));
        assertThat(RoleMatrix.fromWire(null, null, null).mods().cells()).isEmpty();
        assertThat(RoleMatrix.empty().toWire().get("mods")).isEqualTo(Map.of());
    }

    @Test
    void aWriteIsRefusedForAnUnknownRowAPhaseABadIdOrMoreThanTwentyMods() {
        assertThatThrownBy(() -> withMods(Map.of("nope", Map.of("review", List.of("a")))))
                .isInstanceOf(OfficiumException.class).hasMessageContaining("Unknown mods row: nope");
        assertThatThrownBy(() -> withMods(Map.of("bug", Map.of("nope", List.of("a")))))
                .isInstanceOf(OfficiumException.class);
        assertThatThrownBy(() -> withMods(Map.of("bug", Map.of("review", List.of("Not Kebab")))))
                .isInstanceOf(OfficiumException.class).hasMessageContaining("kebab-case");
        List<String> tooMany = java.util.stream.IntStream.range(0, 21).mapToObj(i -> "mod-" + i).toList();
        assertThatThrownBy(() -> withMods(Map.of("bug", Map.of("review", tooMany))))
                .isInstanceOf(OfficiumException.class).hasMessageContaining("At most 20 mods");
    }
}
