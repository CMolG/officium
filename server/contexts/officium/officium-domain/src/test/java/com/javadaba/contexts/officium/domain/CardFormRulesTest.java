package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Who answers a human card's form, when the answer moves the card, and how it reads (JAVA-894). */
class CardFormRulesTest {

    private static final UUID ASSIGNEE = UUID.randomUUID();
    private static final Instant T0 = Instant.parse("2026-10-03T10:00:00Z");

    private static Card card(Executor executor, Status status, List<Assignee> assignees) {
        return new Card(UUID.randomUUID(), UUID.randomUUID(), "JAVA-1", 1, "Decide", "Body", null, status,
                RunState.IDLE, Priority.MEDIUM, executor, null, 0, 0, null, List.of(), assignees, 1, T0, T0,
                Actor.agent(UUID.randomUUID(), "claude-code"), Actor.agent(UUID.randomUUID(), "claude-code"), null,
                null, null, null, 0, List.of(), null);
    }

    private static Card human(Status status) {
        return card(Executor.HUMAN, status, List.of(new Assignee(ASSIGNEE, "Carlos")));
    }

    @ParameterizedTest
    @EnumSource(value = Status.class, names = {"REFINE", "TODO", "DOING"})
    void theAssigneeAnswersACardThatStillWaitsOnThem(Status status) {
        assertThat(CardFormRules.answeringAssignee(human(status), ASSIGNEE)).map(Assignee::name).contains("Carlos");
    }

    @ParameterizedTest
    @EnumSource(value = Status.class, names = {"READY", "REVIEW", "DEPLOY", "DONE", "REJECTED"})
    void aCardAlreadyPastReadyIsNeverMovedBack(Status status) {
        assertThat(CardFormRules.answeringAssignee(human(status), ASSIGNEE)).isEmpty();
    }

    @Test
    void aStrangerAnAnonymousRespondentAndAFreeTextAssigneeDoNotAnswerIt() {
        assertThat(CardFormRules.answeringAssignee(human(Status.TODO), UUID.randomUUID())).isEmpty();
        assertThat(CardFormRules.answeringAssignee(human(Status.TODO), null)).isEmpty();
        Card contractor = card(Executor.HUMAN, Status.TODO, List.of(new Assignee(null, "A contractor")));
        assertThat(CardFormRules.answeringAssignee(contractor, ASSIGNEE)).isEmpty();
    }

    @Test
    void onlyAHumanCardCarriesAForm() {
        Card agentCard = card(Executor.AI, Status.TODO, List.of(new Assignee(ASSIGNEE, "Carlos")));

        assertThat(CardFormRules.answeringAssignee(agentCard, ASSIGNEE)).isEmpty();
        assertThatThrownBy(() -> CardFormRules.requireHumanCard(agentCard))
                .isInstanceOfSatisfying(OfficiumException.class, ex -> {
                    assertThat(ex.code()).isEqualTo("form_needs_human_card");
                    assertThat(ex.httpStatus()).isEqualTo(409);
                });
        CardFormRules.requireHumanCard(human(Status.TODO));
    }

    @Test
    void theFormIsOpenWhileTheCardWaitsAnsweredOnceItMovedOnWithAnAnswerAndClosedWithout() {
        assertThat(CardFormRules.state(Status.TODO, false)).isEqualTo("open");
        assertThat(CardFormRules.state(Status.TODO, true)).isEqualTo("open");
        assertThat(CardFormRules.state(Status.READY, true)).isEqualTo("answered");
        assertThat(CardFormRules.state(Status.READY, false)).isEqualTo("closed");
    }

    @Test
    void theAnswersReadAsOneBlockPerQuestion() {
        String comment = CardFormRules.comment(List.of(
                new AnsweredQuestion("q1", "Which region?", "eu-west"),
                new AnsweredQuestion("q2", "Is it stored?", true),
                new AnsweredQuestion("q3", "Which environments?", List.of("staging", "prod")),
                new AnsweredQuestion("q4", "How many?", 3L)));

        assertThat(comment).isEqualTo("""
                Answered the form:

                **Which region?**
                eu-west

                **Is it stored?**
                Yes

                **Which environments?**
                staging, prod

                **How many?**
                3""");
    }
}
