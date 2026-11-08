package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1875: one implementer on every action cell of a project that executes by epic. */
class ImplementerMatrixTest {

    private static final String IMPLEMENTER = "core-implementer";
    private static final RoleMatrix EPIC_MODE = ImplementerMatrix.apply(RoleMatrix.defaults(), IMPLEMENTER);

    @Test
    void everyActionCellButTheSpikesNamesTheImplementerAloneSignalsIncluded() {
        for (Category category : Category.values()) {
            List<String> eligible = EPIC_MODE.eligible(category, null, Status.TODO, List.of(Signal.values()));
            if (category == Category.SPIKE) {
                assertThat(eligible).as("spike").doesNotContain(IMPLEMENTER).isNotEmpty();
            } else {
                assertThat(eligible).as(category.wire()).containsExactly(IMPLEMENTER);
            }
        }
        assertThat(EPIC_MODE.eligible(Category.SPIKE, SpikeSubtype.UX_UI, Status.DOING, List.of()))
                .doesNotContain(IMPLEMENTER);
    }

    @Test
    void planningReviewAndTheOtherPhasesKeepTheirSpecializedRoles() {
        for (Status status : List.of(Status.REFINE, Status.READY, Status.REVIEW, Status.DEPLOY)) {
            assertThat(EPIC_MODE.eligible(Category.FEATURE, null, status, List.of(Signal.TOUCHES_UI)))
                    .as(status.wire())
                    .isEqualTo(
                            RoleMatrix.defaults().eligible(Category.FEATURE, null, status, List.of(Signal.TOUCHES_UI)));
        }
    }

    @Test
    void theRunsStayTheMatrixsSoTheSweepRunsOnTheEpicCell() {
        assertThat(EPIC_MODE.runs()).isEqualTo(RoleMatrix.defaults().runs());
        assertThat(EPIC_MODE.implementer()).isEqualTo(IMPLEMENTER);
        assertThat(RoleMatrix.defaults().implementer()).isNull();
    }

    @Test
    void theImplementerCarriesTheRetiredRolesSpecialtiesAsModsByCategoryAndSignal() {
        Map<String, List<String>> mods = EPIC_MODE.modsByRole(Category.FEATURE, null, Status.TODO,
                List.of(Signal.TOUCHES_UI, Signal.TOUCHES_DATA_SCHEMA), ModRules.none(), dropped -> {
                });

        assertThat(mods.get(IMPLEMENTER)).contains("api-contract-first", "resilient-backend", "error-ux",
                "db-migrations-safe").doesNotHaveDuplicates();
    }

    @Test
    void aResearcherOnASpikeThatTouchesTheUiGetsNoneOfTheImplementersMods() {
        Map<String, List<String>> mods = EPIC_MODE.modsByRole(Category.SPIKE, null, Status.DOING,
                List.of(Signal.TOUCHES_UI), ModRules.none(), dropped -> {
                });

        assertThat(mods.values().stream().flatMap(List::stream)).doesNotContain("error-ux", "web-vitals");
    }

    @Test
    void cardModeServesExactlyTheMatrixItAlwaysDid() {
        assertThat(RoleMatrix.defaults().toWire()).doesNotContainKeys("implementer", "implementerMods");
        assertThat(EPIC_MODE.toWire()).containsEntry("implementer", IMPLEMENTER).containsKey("implementerMods");
        assertThat(RoleMatrix.defaults().eligible(Category.FEATURE, null, Status.TODO, List.of()))
                .doesNotContain(IMPLEMENTER);
    }

    @Test
    void aWorkflowNamingARetiredActionRoleIsWorkedByTheImplementerWithItsMods() {
        CardWorkflow workflow = new CardWorkflow(Map.of(Phase.ACTION,
                new CardWorkflow.Pick("frontend-developer", List.of("cognitive-ux"))));

        assertThat(CardRoles.eligible(EPIC_MODE, Category.FEATURE, null, Status.TODO, List.of(Signal.TOUCHES_UI),
                workflow)).containsExactly(IMPLEMENTER);
        assertThat(CardRoles.mods(EPIC_MODE, ModRules.none(), Category.FEATURE, null, Status.TODO,
                List.of(Signal.TOUCHES_UI), workflow, dropped -> {
                }).get(IMPLEMENTER))
                .contains("cognitive-ux", "error-ux", "api-contract-first");
        assertThat(workflow.problemsFor(EPIC_MODE, ModRules.none(), Category.FEATURE, null,
                List.of(Signal.TOUCHES_UI))).isEmpty();
        assertThat(CardRoles.eligible(RoleMatrix.defaults(), Category.FEATURE, null, Status.TODO,
                List.of(Signal.TOUCHES_UI), workflow)).containsExactly("frontend-developer");
    }
}
