package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** What counts as a person editing a card (user request, 2026-09-23). */
class CardContentTest {

    private static final Actor PERSON = Actor.person(UUID.randomUUID(), "Carlos");
    private static final Actor AGENT = Actor.agent(UUID.randomUUID(), "claude-code");
    private static final Instant T0 = Instant.parse("2026-09-23T10:00:00Z");

    private static Card card(String description, String actionPlan) {
        return card(description, actionPlan, null);
    }

    private static Card card(String description, String actionPlan, Category category) {
        return card(description, actionPlan, category, null);
    }

    private static Card card(String description, String actionPlan, Category category, SpikeSubtype subtype) {
        return new Card(UUID.randomUUID(), UUID.randomUUID(), "OFF-1", 1, "Title", description, actionPlan,
                Status.TODO, RunState.IDLE, Priority.MEDIUM, Executor.HUMAN, category, 0, 2, null, List.of("a"),
                List.of(new Assignee(PERSON.accountId(), "Carlos")), 3, T0, T0, AGENT, AGENT, null, null, null, null,
                0, List.of(), subtype);
    }

    @Test
    void savingWhatTheCardAlreadySaysIsNotAnEdit() {
        Card current = card("Body", null);

        assertThat(current.sameContentAs(card("Body", ""))).isTrue();
        assertThat(current.sameContentAs(card("Body", "## Plan"))).isFalse();
        assertThat(current.sameContentAs(card("Body changed", null))).isFalse();
    }

    @Test
    void theCategoryIsPartOfWhatTheCardSays() {
        Card bug = card("Body", null, Category.BUG);

        assertThat(bug.sameContentAs(card("Body", null, Category.BUG))).isTrue();
        assertThat(bug.sameContentAs(card("Body", null, Category.HOTFIX))).isFalse();
        assertThat(bug.sameContentAs(card("Body", null, null))).isFalse();
    }

    @Test
    void aPersonsEditIsPendingUntilAnAgentReviewsIt() {
        Card edited = card("Body", null).editedBy(PERSON, T0.plusSeconds(60));

        assertThat(edited.version()).isEqualTo(4);
        assertThat(edited.humanEdit().editedBy()).isEqualTo(PERSON);
        assertThat(edited.humanEditPending()).isTrue();

        Card reviewed = edited.withHumanEdit(edited.humanEdit().reviewed(T0.plusSeconds(120)));
        assertThat(reviewed.humanEditPending()).isFalse();

        Card editedAgain = reviewed.editedBy(PERSON, T0.plusSeconds(180));
        assertThat(editedAgain.humanEditPending()).isTrue();
        assertThat(editedAgain.humanEdit().reviewedAt()).isEqualTo(T0.plusSeconds(120));
    }

    @Test
    void anAgentsEditIsNotAHumanEdit() {
        Card byAgent = card("Body", null).editedBy(AGENT, T0.plusSeconds(60));

        assertThat(byAgent.humanEdit()).isNull();
        assertThat(byAgent.humanEditPending()).isFalse();
        assertThat(byAgent.updatedBy()).isEqualTo(AGENT);
    }

    @Test
    void onlyAPersonMakesAHumanEdit() {
        assertThatThrownBy(() -> new HumanEdit(T0, AGENT, null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void theExcerptIsPlainText() {
        assertThat(card("## Why this needs you\n**Console** access", null).excerpt())
                .isEqualTo("Why this needs you Console access");
    }

    @Test
    void aSpikeAlwaysHasASubtypeAndNoOtherCardEverDoes() {
        assertThat(card("Body", null, Category.SPIKE).subtype()).isEqualTo(SpikeSubtype.TECHNICAL);
        assertThat(card("Body", null, Category.SPIKE, SpikeSubtype.UX_UI).subtype()).isEqualTo(SpikeSubtype.UX_UI);
        assertThat(card("Body", null, Category.BUG, SpikeSubtype.UX_UI).subtype()).isNull();
        assertThat(card("Body", null, null, SpikeSubtype.UX_UI).subtype()).isNull();
    }

    @Test
    void theSubtypeIsPartOfWhatTheCardSays() {
        assertThat(card("Body", null, Category.SPIKE).sameContentAs(
                card("Body", null, Category.SPIKE, SpikeSubtype.UX_UI))).isFalse();
        assertThat(card("Body", null, Category.SPIKE).sameContentAs(
                card("Body", null, Category.SPIKE, SpikeSubtype.TECHNICAL))).isTrue();
    }
}
