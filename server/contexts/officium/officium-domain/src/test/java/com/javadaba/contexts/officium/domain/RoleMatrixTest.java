package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RoleMatrixTest {

    private static final RoleMatrix DEFAULTS = RoleMatrix.defaults();

    @Test
    void aBugInToDoWithTouchesUiGetsTheBugActionRolesAndNothingFromTheSignal() {
        assertThat(DEFAULTS.eligible(Category.BUG, null, Status.TODO, List.of(Signal.TOUCHES_UI))).containsExactly(
                "backend-developer", "frontend-developer", "data-engineer", "test-automation-engineer");
    }

    @Test
    void theSameBugInReviewAddsTheAccessibilityReviewer() {
        assertThat(DEFAULTS.eligible(Category.BUG, null, Status.REVIEW, List.of(Signal.TOUCHES_UI)))
                .containsExactly("code-reviewer", "acceptance-qa", "ux-ui-accessibility-reviewer");
    }

    @Test
    void doingIsActionAndReadyIsDeliveryAnalysisForEveryCategory() {
        assertThat(DEFAULTS.eligible(Category.BUG, null, Status.DOING, List.of()))
                .isEqualTo(DEFAULTS.eligible(Category.BUG, null, Status.TODO, List.of()));
        for (Category category : Category.values()) {
            assertThat(DEFAULTS.eligible(category, null, Status.READY, List.of())).containsExactly("delivery-analyst");
        }
    }

    @Test
    void aRoleBothTheCategoryAndASignalBringIsListedOnce() {
        assertThat(DEFAULTS.eligible(Category.FEATURE, null, Status.REVIEW, List.of(Signal.TOUCHES_UI)))
                .containsExactly("code-reviewer", "acceptance-qa", "ux-ui-accessibility-reviewer");
        assertThat(DEFAULTS.eligible(Category.HOTFIX, null, Status.REFINE,
                List.of(Signal.TOUCHES_INFRASTRUCTURE, Signal.TOUCHES_AUTH_PERMISSIONS_OR_PERSONAL_DATA)))
                .containsExactly("incident-analyst", "security-architect", "platform-architect");
    }

    @Test
    void doneAsksForNoRoleAndNoCategoryGivesOnlyTheSignals() {
        assertThat(DEFAULTS.eligible(Category.BUG, null, Status.DONE, List.of(Signal.TOUCHES_UI))).isEmpty();
        assertThat(DEFAULTS.eligible(null, null, Status.REVIEW, List.of(Signal.TOUCHES_HOT_PATHS_OR_HEAVY_QUERIES)))
                .containsExactly("performance-reviewer");
        assertThat(DEFAULTS.eligible(Category.EPIC, null, Status.TODO, List.of())).isEmpty();
    }

    @Test
    void aUxUiSpikeReadsItsOwnRowInEveryPhase() {
        for (Status status : List.of(Status.REFINE, Status.TODO, Status.REVIEW, Status.DEPLOY)) {
            Phase phase = Phase.of(status).orElseThrow();
            assertThat(DEFAULTS.eligible(Category.SPIKE, SpikeSubtype.UX_UI, status, List.of()))
                    .containsExactlyElementsOf(DEFAULTS.categories().get(RoleMatrix.SPIKE_UX_UI).get(phase));
        }
        // card://JAVA-525: a design deliverable is the designer's to work, not only to plan.
        assertThat(DEFAULTS.eligible(Category.SPIKE, SpikeSubtype.UX_UI, Status.DOING, List.of()))
                .containsExactly("ux-ui-designer", "ux-researcher");
    }

    @Test
    void touchingTheUiNoLongerPicksTheSpikeRowItOnlyAddsTheSignalsRoles() {
        assertThat(DEFAULTS.eligible(Category.SPIKE, SpikeSubtype.TECHNICAL, Status.DOING, List.of()))
                .containsExactly("technical-researcher");
        assertThat(DEFAULTS.eligible(Category.SPIKE, SpikeSubtype.TECHNICAL, Status.REVIEW,
                List.of(Signal.TOUCHES_UI)))
                .containsExactly("findings-evaluator", "architecture-reviewer", "ux-ui-accessibility-reviewer");
        assertThat(DEFAULTS.eligible(Category.SPIKE, null, Status.DOING, List.of(Signal.TOUCHES_UI)))
                .containsExactly("technical-researcher");
    }

    @Test
    void everyCategoryHasARowAndEveryRowAllFivePhases() {
        for (String key : RoleMatrix.rowKeys()) {
            assertThat(DEFAULTS.categories()).containsKey(key);
            assertThat(DEFAULTS.categories().get(key)).containsOnlyKeys(Phase.values());
        }
        assertThat(DEFAULTS.signals()).containsOnlyKeys(Signal.values());
    }

    @Test
    void anOverrideReplacesOnlyTheCellsItNames() {
        RoleMatrix override = RoleMatrix.fromWire(
                Map.of("bug", Map.of("review", List.of("security-reviewer"))),
                Map.of("touches-ui", Map.of("review", List.of())));
        RoleMatrix effective = DEFAULTS.overlay(override);

        assertThat(effective.eligible(Category.BUG, null, Status.REVIEW, List.of(Signal.TOUCHES_UI)))
                .containsExactly("security-reviewer");
        assertThat(effective.eligible(Category.BUG, null, Status.TODO, List.of()))
                .isEqualTo(DEFAULTS.eligible(Category.BUG, null, Status.TODO, List.of()));
        assertThat(effective.eligible(Category.FEATURE, null, Status.REVIEW, List.of()))
                .isEqualTo(DEFAULTS.eligible(Category.FEATURE, null, Status.REVIEW, List.of()));
    }

    @Test
    void theWireShapeReadsBackToTheSameMatrix() {
        @SuppressWarnings("unchecked")
        Map<String, Map<String, List<String>>> rows = (Map<String, Map<String, List<String>>>) DEFAULTS.toWire()
                .get("categories");
        @SuppressWarnings("unchecked")
        Map<String, Map<String, List<String>>> signals = (Map<String, Map<String, List<String>>>) DEFAULTS.toWire()
                .get("signals");

        @SuppressWarnings("unchecked")
        Map<String, Map<String, Object>> runs = (Map<String, Map<String, Object>>) DEFAULTS.toWire().get("runs");

        assertThat(RoleMatrix.fromWire(rows, signals, runs)).isEqualTo(DEFAULTS);
    }

    @Test
    void anOverrideWithAnUnknownRowPhaseSignalOrRoleIsRefused() {
        assertThatThrownBy(() -> RoleMatrix.fromWire(Map.of("chore", Map.of()), null))
                .hasMessageContaining("Unknown category row");
        assertThatThrownBy(() -> RoleMatrix.fromWire(Map.of("bug", Map.of("qa", List.of())), null))
                .hasMessageContaining("Unknown phase");
        assertThatThrownBy(() -> RoleMatrix.fromWire(null, Map.of("touches-everything", Map.of())))
                .hasMessageContaining("Unknown signal");
        assertThatThrownBy(() -> RoleMatrix.fromWire(Map.of("bug", Map.of("review", List.of("Code Reviewer"))), null))
                .hasMessageContaining("kebab-case");
    }
}
