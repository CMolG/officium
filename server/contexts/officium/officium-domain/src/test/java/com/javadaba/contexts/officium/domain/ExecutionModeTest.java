package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static com.javadaba.contexts.officium.domain.EpicFixtures.blocks;
import static com.javadaba.contexts.officium.domain.EpicFixtures.child;
import static com.javadaba.contexts.officium.domain.EpicFixtures.epic;
import static com.javadaba.contexts.officium.domain.EpicFixtures.standalone;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1878: a project's execution mode, and what switching it does to the open cards. */
class ExecutionModeTest {

    @Test
    void aProjectThatNeverChoseExecutesCardByCardWithTheDefaultImplementer() {
        assertThat(ExecutionMode.CARD.epic()).isFalse();
        assertThat(ExecutionMode.of("epic", null)).isEqualTo(new ExecutionMode(ExecutionMode.Mode.EPIC,
                "core-implementer"));
        assertThat(ExecutionMode.of("epic", " my-implementer ").implementerRole()).isEqualTo("my-implementer");
    }

    @Test
    void anUnknownModeOrARoleThatIsNoKebabIdIsRefusedNamingItsField() {
        assertThatThrownBy(() -> ExecutionMode.of("sweep", null)).isInstanceOfSatisfying(
                ExecutionMode.InvalidException.class, ex -> assertThat(ex.field()).isEqualTo("mode"));
        assertThatThrownBy(() -> ExecutionMode.of(null, null)).isInstanceOf(ExecutionMode.InvalidException.class);
        assertThatThrownBy(() -> ExecutionMode.of("epic", "Core Implementer")).isInstanceOfSatisfying(
                ExecutionMode.InvalidException.class, ex -> assertThat(ex.field()).isEqualTo("implementerRole"));
    }

    @Test
    void thePreviewMapsEveryOpenCardToExactlyOneUnitAndChangesNone() {
        Card e = epic("JAVA-1").card();
        Card a = child("JAVA-2", "JAVA-1").card();
        Card b = child("JAVA-3", "JAVA-1").status(Status.REVIEW).card();
        Card done = child("JAVA-4", "JAVA-1").status(Status.DONE).card();
        Card loose = standalone("JAVA-5");
        Card labelled = child("JAVA-6", "Some area").card();
        List<Card> project = List.of(e, a, b, done, loose, labelled);

        ExecutionPreview preview = ExecutionPreview.of(ExecutionMode.of("epic", null), project,
                List.of(blocks(a, b)));

        assertThat(preview.openCards()).isEqualTo(4);
        assertThat(preview.inEpics()).isEqualTo(2);
        assertThat(preview.standalone()).isEqualTo(2);
        assertThat(preview.epics()).containsExactly(new ExecutionPreview.EpicUnit("JAVA-1", "Title JAVA-1", 3, 2, 1));
        assertThat(project).containsExactly(e, a, b, done, loose, labelled);
    }

    @Test
    void thePreviewNamesTheWorkflowsWhoseActionRoleRetiresAndKeepsTheirMods() {
        CardWorkflow workflow = new CardWorkflow(Map.of(Phase.ACTION,
                new CardWorkflow.Pick("backend-developer", List.of("regression-sentinel"))));
        Card withWorkflow = child("JAVA-2", null).workflow(workflow).card();

        assertThat(ExecutionPreview.of(ExecutionMode.of("epic", null), List.of(withWorkflow), List.of()).workflows())
                .containsExactly(new ExecutionPreview.RetiredRole("JAVA-2", "backend-developer",
                        List.of("regression-sentinel")));
        assertThat(ExecutionPreview.of(ExecutionMode.CARD, List.of(withWorkflow), List.of()).workflows()).isEmpty();
    }

    @Test
    void thePreviewNamesARoleAnEpicsWorkflowGivesItsCardsUnderEachCardItGoverns() {
        CardWorkflow written = new CardWorkflow(Map.of(), Map.of("feature", Map.of(Phase.ACTION,
                new CardWorkflow.Pick("backend-developer", List.of("regression-sentinel")))));
        Card e = epic("JAVA-1").workflow(written).card();
        Card a = child("JAVA-2", "JAVA-1").card();

        assertThat(ExecutionPreview.of(ExecutionMode.of("epic", null), List.of(e, a), List.of()).workflows())
                .containsExactly(new ExecutionPreview.RetiredRole("JAVA-2", "backend-developer",
                        List.of("regression-sentinel")));
    }
}
