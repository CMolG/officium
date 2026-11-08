package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1592: the Refine exit checks the workflow and the plan together; a plan follows its workflow. */
class PlanContractTest {

    private static final String BASE = "Base: control branch `feat/cb-java-sprint-3-12`\n";
    private static final CardWorkflow WORKFLOW = new CardWorkflow(Map.of(Phase.REFINE,
            new CardWorkflow.Pick("software-architect", List.of())));
    private static final CardWorkflow NO_REFINE = new CardWorkflow(Map.of());

    @Test
    void exitNamesEverySlotThatIsMissing() {
        assertThatThrownBy(() -> exit(null, List.of(), null))
                .hasMessageContaining("the card has no workflow")
                .hasMessageContaining("the card has no action plan");
    }

    @Test
    void exitNamesAStaleWorkflowWithItsReasons() {
        CardWorkflow.Problem stale = new CardWorkflow.Problem("refine", "x is not eligible in refine");

        assertThatThrownBy(() -> exit(WORKFLOW, List.of(stale), BASE + "Role: software-architect\nPlan."))
                .hasMessageContaining("the workflow no longer fits the card: refine: x is not eligible in refine");
    }

    @Test
    void exitRefusesAWorkflowWithNoRefineRole() {
        assertThatThrownBy(() -> exit(NO_REFINE, List.of(), BASE + "Plan."))
                .hasMessageContaining("the workflow names no role for refine");
    }

    @Test
    void exitRequiresTheBaseLineAndTheRefineRole() {
        assertThatThrownBy(() -> exit(WORKFLOW, List.of(), "Plan without a base."))
                .hasMessageContaining("first line is not `Base:")
                .hasMessageContaining("no `Role: software-architect` line");
        assertThatThrownBy(() -> exit(WORKFLOW, List.of(), BASE + "Role: code-reviewer\nPlan."))
                .hasMessageContaining("no `Role: software-architect` line");
    }

    @Test
    void exitPassesWithTheWorkflowAndAPlanThatOpensWithItsBase() {
        assertThatCode(() -> exit(WORKFLOW, List.of(), BASE + "Role: software-architect\nPlan."))
                .doesNotThrowAnyException();
    }

    @Test
    void theRoleIdEndsAtTheFirstDelimiterAndNeverAtAPrefix() {
        assertThatCode(
                () -> exit(WORKFLOW, List.of(), BASE + "Role: software-architect. The card changes a contract.\nPlan."))
                .doesNotThrowAnyException();
        assertThatCode(() -> exit(WORKFLOW, List.of(), BASE + "Role: software-architect (action)\nPlan."))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> exit(WORKFLOW, List.of(), BASE + "Role: software-architects\nPlan."))
                .hasMessageContaining("no `Role: software-architect` line");
    }

    @Test
    void exitSkipsTheExemptCardsAndAMoveThatIsNotRefineToWork() {
        assertThatCode(() -> PlanContract.requireExit(Executor.HUMAN, Category.FEATURE, Status.REFINE, Status.TODO,
                governing(null), List.of(), null)).doesNotThrowAnyException();
        assertThatCode(() -> PlanContract.requireExit(Executor.AI, Category.HOTFIX, Status.REFINE, Status.TODO,
                governing(null), List.of(), null)).doesNotThrowAnyException();
        assertThatCode(() -> PlanContract.requireExit(Executor.AI, Category.FEATURE, Status.REVIEW, Status.TODO,
                governing(null), List.of(), null)).doesNotThrowAnyException();
    }

    @Test
    void aCardOfAnEpicWithNoWorkflowIsSentToWriteTheEpics() {
        GoverningWorkflow none = new GoverningWorkflow(null, "JAVA-1", false, "its epic JAVA-1 has no workflow yet");

        assertThatThrownBy(() -> PlanContract.requireExit(Executor.AI, Category.FEATURE, Status.REFINE, Status.TODO,
                none, List.of(), BASE + "Plan."))
                .hasMessageContaining("its epic JAVA-1 has no workflow yet")
                .hasMessageNotContaining("the card has no workflow");
    }

    @Test
    void aPlanBeforeItsWorkflowIsRefused() {
        assertThatThrownBy(() -> PlanContract.requireWorkflowFirst(Executor.AI, Category.FEATURE, Status.REFINE,
                null, null, BASE + "Plan."))
                .hasMessageContaining("Set the workflow first");
    }

    @Test
    void clearingOrResendingAPlanBeforeItsWorkflowIsNotRefused() {
        assertThatCode(() -> PlanContract.requireWorkflowFirst(Executor.AI, Category.FEATURE, Status.REFINE,
                null, BASE + "Plan.", "")).doesNotThrowAnyException();
        assertThatCode(() -> PlanContract.requireWorkflowFirst(Executor.AI, Category.FEATURE, Status.REFINE,
                null, BASE + "Plan.", BASE + "Plan.")).doesNotThrowAnyException();
    }

    private static void exit(CardWorkflow workflow, List<CardWorkflow.Problem> problems, String plan) {
        PlanContract.requireExit(Executor.AI, Category.FEATURE, Status.REFINE, Status.TODO, governing(workflow),
                problems, plan);
    }

    private static GoverningWorkflow governing(CardWorkflow workflow) {
        return new GoverningWorkflow(workflow, null, false, GoverningWorkflow.NO_WORKFLOW);
    }
}
