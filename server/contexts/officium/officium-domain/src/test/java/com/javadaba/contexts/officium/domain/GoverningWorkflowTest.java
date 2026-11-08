package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

import static com.javadaba.contexts.officium.domain.EpicFixtures.child;
import static com.javadaba.contexts.officium.domain.EpicFixtures.epic;
import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1885: an epic's workflow is written once and governs its cards; every other card keeps its own. */
class GoverningWorkflowTest {

    private static final CardWorkflow.Pick ARCHITECT = new CardWorkflow.Pick("software-architect", List.of());
    private static final CardWorkflow OWN = new CardWorkflow(Map.of(Phase.REFINE,
            new CardWorkflow.Pick("tech-lead", List.of())));
    private static final CardWorkflow EPIC_WORKFLOW = new CardWorkflow(Map.of(Phase.REFINE,
            new CardWorkflow.Pick("tech-lead", List.of())), Map.of("feature", Map.of(Phase.REFINE, ARCHITECT)));

    @Test
    void aCardOfAnEpicWhoseWorkflowIsWrittenIsGovernedByItsPartAndNotByItsOwn() {
        Card epic = epic("JAVA-1").workflow(EPIC_WORKFLOW).card();
        Card child = child("JAVA-2", "JAVA-1").workflow(OWN).card();

        GoverningWorkflow governing = GoverningWorkflow.over(List.of(epic, child)).apply(child);

        assertThat(governing.workflow()).isEqualTo(new CardWorkflow(Map.of(Phase.REFINE, ARCHITECT)));
        assertThat(governing.from()).isEqualTo("JAVA-1");
        assertThat(governing.problems(RoleMatrix.defaults(), ModRules.none(), child)).isEmpty();
    }

    @Test
    void aCardWhoseCategoryHasNoPartIsGovernedByNothingAndSaysWhereToAddIt() {
        Card epic = epic("JAVA-1").workflow(EPIC_WORKFLOW).card();
        Card bug = child("JAVA-3", "JAVA-1").category(Category.BUG).card();

        GoverningWorkflow governing = GoverningWorkflow.over(List.of(epic, bug)).apply(bug);

        assertThat(governing.workflow()).isNull();
        assertThat(governing.from()).isEqualTo("JAVA-1");
        assertThat(governing.problems(RoleMatrix.defaults(), ModRules.none(), bug))
                .containsExactly(new CardWorkflow.Problem("document", "its epic JAVA-1's workflow has no part for bug"
                        + " cards (add one there: cards.setWorkflow on JAVA-1)"));
    }

    @Test
    void aCardWhoseEpicHasNoWorkflowYetKeepsItsOwnAndIsSentToWriteTheEpics() {
        Card epic = epic("JAVA-1").card();
        Card carried = child("JAVA-2", "JAVA-1").workflow(OWN).card();
        Card fresh = child("JAVA-3", "JAVA-1").card();
        Function<Card, GoverningWorkflow> governing = GoverningWorkflow.over(List.of(epic, carried, fresh));

        assertThat(governing.apply(carried).workflow()).isEqualTo(OWN);
        assertThat(governing.apply(carried).from()).isNull();
        assertThat(governing.apply(fresh).workflow()).isNull();
        assertThat(governing.apply(fresh).missing()).isEqualTo("its epic JAVA-1 has no workflow yet (write it there,"
                + " once for all its cards: cards.setWorkflow on JAVA-1, with a part for feature cards)");
        assertThat(governing.apply(fresh).problems(RoleMatrix.defaults(), ModRules.none(), fresh)).isEmpty();
    }

    @Test
    void aCardWithNoEpicOrALabelForOneAndAnEpicItselfAreGovernedByTheirOwn() {
        Card loose = child("JAVA-5", null).workflow(OWN).card();
        Card labelled = child("JAVA-6", "Some area").workflow(OWN).card();
        Card epic = epic("JAVA-1").workflow(EPIC_WORKFLOW).card();
        Function<Card, GoverningWorkflow> governing = GoverningWorkflow.over(List.of(loose, labelled, epic));

        assertThat(List.of(loose, labelled, epic))
                .allSatisfy(card -> assertThat(governing.apply(card)).isEqualTo(GoverningWorkflow.own(card)));
        assertThat(governing.apply(epic).workflow()).isEqualTo(EPIC_WORKFLOW);
    }

    @Test
    void aDeletedEpicGovernsNothing() {
        Card epic = epic("JAVA-1").workflow(EPIC_WORKFLOW).card();
        Card deleted = new Card(epic.id(), epic.projectId(), epic.key(), epic.number(), epic.title(), null, null,
                epic.status(), epic.runState(), epic.priority(), epic.executor(), epic.category(), 0, 0, null,
                List.of(), List.of(), 1, epic.createdAt(), epic.updatedAt(), null, null, epic.createdAt(), null, null,
                null, 0, List.of(), null, null, EPIC_WORKFLOW);
        Card child = child("JAVA-2", "JAVA-1").workflow(OWN).card();

        assertThat(GoverningWorkflow.of(child, key -> Optional.of(deleted)))
                .isEqualTo(GoverningWorkflow.own(child));
    }
}
