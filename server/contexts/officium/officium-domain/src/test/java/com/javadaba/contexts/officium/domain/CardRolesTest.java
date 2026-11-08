package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1591: a card without a workflow answers the matrix; a workflow changes only the phase it names. */
class CardRolesTest {

    private static final RoleMatrix MATRIX = RoleMatrix.defaults();
    private static final List<List<Signal>> SIGNAL_SETS = List.of(List.of(), List.of(Signal.TOUCHES_UI));

    @Test
    void aCardWithoutAWorkflowAnswersExactlyTheMatrixForEveryCategoryStatusAndSignalSet() {
        for (Category category : Category.values()) {
            for (Status status : Status.values()) {
                for (List<Signal> signals : SIGNAL_SETS) {
                    assertThat(CardRoles.eligible(MATRIX, category, null, status, signals, null))
                            .isEqualTo(MATRIX.eligible(category, null, status, signals));
                    assertThat(CardRoles.runConfigs(MATRIX, category, null, status, signals, null))
                            .isEqualTo(MATRIX.runConfigs(category, null, status, signals));
                    assertThat(CardRoles.runConfig(MATRIX, category, null, status, signals, null))
                            .isEqualTo(MATRIX.runConfig(category, null, status));
                    assertThat(CardRoles.mods(MATRIX, ModRules.none(), category, null, status, signals, null,
                            ignored -> {
                            }))
                            .isEqualTo(MATRIX.modsByRole(category, null, status, signals, ModRules.none(), ignored -> {
                            }));
                }
            }
        }
    }

    @Test
    void thePickedRoleIsTheOnlyEligibleOneInItsPhaseAndKeepsItsCellsOverride() {
        String role = MATRIX.eligible(Category.FEATURE, null, Status.TODO, List.of()).get(0);
        CardWorkflow workflow = new CardWorkflow(Map.of(Phase.ACTION, new CardWorkflow.Pick(role, List.of())));

        assertThat(CardRoles.eligible(MATRIX, Category.FEATURE, null, Status.TODO, List.of(), workflow))
                .containsExactly(role);
        assertThat(CardRoles.runConfigs(MATRIX, Category.FEATURE, null, Status.TODO, List.of(), workflow))
                .containsOnlyKeys(role);
        assertThat(CardRoles.runConfig(MATRIX, Category.FEATURE, null, Status.TODO, List.of(), workflow))
                .contains(MATRIX.runConfigs(Category.FEATURE, null, Status.TODO, List.of()).get(role));
    }

    @Test
    void aPhaseTheWorkflowLeavesOutKeepsTheMatrixAnswer() {
        CardWorkflow refineOnly = new CardWorkflow(Map.of(Phase.REFINE,
                new CardWorkflow.Pick(MATRIX.eligible(Category.FEATURE, null, Status.REFINE, List.of()).get(0),
                        List.of())));

        assertThat(CardRoles.eligible(MATRIX, Category.FEATURE, null, Status.TODO, List.of(), refineOnly))
                .isEqualTo(MATRIX.eligible(Category.FEATURE, null, Status.TODO, List.of()));
    }

    @Test
    void aStalePickNoLongerEligibleFallsBackToTheMatrix() {
        CardWorkflow stale = new CardWorkflow(Map.of(Phase.ACTION, new CardWorkflow.Pick("ghost-role", List.of())));

        assertThat(CardRoles.eligible(MATRIX, Category.FEATURE, null, Status.TODO, List.of(), stale))
                .isEqualTo(MATRIX.eligible(Category.FEATURE, null, Status.TODO, List.of()));
    }

    @Test
    void thePickedRoleKeepsItsRequiredModsAndItsOwnOnesAndTheDroppedAreHeard() {
        String role = MATRIX.eligible(Category.FEATURE, null, Status.TODO, List.of()).get(0);
        CardWorkflow workflow = new CardWorkflow(Map.of(Phase.ACTION, new CardWorkflow.Pick(role, List.of("own-mod"))));
        List<String> dropped = new ArrayList<>();

        Map<String, List<String>> mods = CardRoles.mods(MATRIX, ModRules.none(), Category.FEATURE, null,
                Status.TODO, List.of(), workflow, dropped::add);

        assertThat(mods).containsOnlyKeys(role);
        assertThat(mods.get(role)).endsWith("own-mod");
        assertThat(dropped).isEmpty();
    }
}
