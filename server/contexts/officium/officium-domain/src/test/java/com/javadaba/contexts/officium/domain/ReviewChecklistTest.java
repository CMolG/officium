package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1563: an agent's approval of an ai card carries the rules it checked, and no violated one. */
class ReviewChecklistTest {

    private static final Instant REVIEW = Instant.parse("2026-10-19T10:00:00Z");
    private static final String TABLE = "Rules checked:\n| rule | verdict | evidence |\n|---|---|---|\n"
            + "| architecture:layer | pass | the seam is in the domain |\n"
            + "| clean_code:naming | not verified | not run |\n";

    private static Card card(Status status, Executor executor, List<Signal> signals) {
        Instant now = Instant.EPOCH;
        return new Card(UUID.randomUUID(), UUID.randomUUID(), "OFF-1", 1, "Snake effect", null, null, status,
                RunState.IDLE, Priority.MEDIUM, executor, Category.FEATURE, 0, 0, null, List.of(), List.of(), 1, now,
                now, Actor.agent(UUID.randomUUID(), "claude"), Actor.agent(UUID.randomUUID(), "claude"), null, null,
                null, null, 0, signals, null);
    }

    private static CardComment comment(String text) {
        return new CardComment(UUID.randomUUID(), UUID.randomUUID(), Actor.agent(UUID.randomUUID(), "claude"), text,
                REVIEW.plusSeconds(60), null);
    }

    private static void approve(Card card, List<CardComment> comments, ActorKind actor) {
        ReviewChecklist.require(actor, card, Status.DEPLOY, () -> comments);
    }

    private static Card aiInReview(List<Signal> signals) {
        return card(Status.REVIEW, Executor.AI, signals);
    }

    @Test
    void anAgentsApprovalIsRefusedWithoutTheChecklist() {
        assertThatThrownBy(() -> approve(aiInReview(List.of()), List.of(comment("Looks good.")), ActorKind.AGENT))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("contract_unmet"))
                .hasMessageContaining("Rules checked:");
    }

    @Test
    void aTableWithoutAVerdictRowIsNoChecklist() {
        String header = "Rules checked:\n| rule | verdict | evidence |\n|---|---|---|\n";
        assertThatThrownBy(() -> approve(aiInReview(List.of()), List.of(comment(header)), ActorKind.AGENT))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("contract_unmet"));
    }

    @Test
    void aFullChecklistApproves() {
        assertThatCode(() -> approve(aiInReview(List.of()), List.of(comment(TABLE)), ActorKind.AGENT))
                .doesNotThrowAnyException();
    }

    @Test
    void aViolatedRowRefusesTheApprovalAsASendBack() {
        String text = TABLE + "| clean_code:solid | violated | the class owns two jobs |\n";
        assertThatThrownBy(() -> approve(aiInReview(List.of()), List.of(comment(text)), ActorKind.AGENT))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("review_rule_violated"))
                .hasMessageContaining("clean_code:solid");
    }

    @Test
    void aPassRowWhoseEvidenceSaysViolatedIsStillAPass() {
        String text = "Rules checked:\n| rule | verdict | evidence |\n|---|---|---|\n"
                + "| architecture:layer | **Pass** | no rule violated here |\n";
        assertThatCode(() -> approve(aiInReview(List.of()), List.of(comment(text)), ActorKind.AGENT))
                .doesNotThrowAnyException();
    }

    @Test
    void theLastChecklistSinceReviewDecides() {
        String violated = TABLE + "| clean_code:solid | violated | two jobs |\n";
        assertThatCode(() -> approve(aiInReview(List.of()),
                List.of(comment(violated), comment("Fixed the class.\n\n" + TABLE)), ActorKind.AGENT))
                .doesNotThrowAnyException();
    }

    @Test
    void aTouchesUiCardNeedsScreensInTheVerdictComment() {
        Card ui = aiInReview(List.of(Signal.TOUCHES_UI));
        assertThatThrownBy(() -> approve(ui, List.of(comment(TABLE), comment("Screens: laptop.png")), ActorKind.AGENT))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("contract_unmet"))
                .hasMessageContaining("Screens:");
        assertThatCode(() -> approve(ui, List.of(comment(TABLE + "\nScreens: laptop.png, phone.png")),
                ActorKind.AGENT)).doesNotThrowAnyException();
    }

    @Test
    void aPersonIsNeverRefused() {
        assertThatCode(() -> approve(aiInReview(List.of()), List.of(), ActorKind.PERSON)).doesNotThrowAnyException();
    }

    @Test
    void aWallOrAnEpicOrANonApprovalIsNotGated() {
        assertThatCode(() -> ReviewChecklist.require(ActorKind.AGENT,
                card(Status.REVIEW, Executor.HUMAN, List.of()), Status.DEPLOY, List::of)).doesNotThrowAnyException();
        assertThatCode(() -> ReviewChecklist.require(ActorKind.AGENT,
                card(Status.DEPLOY, Executor.AI, List.of()), Status.DONE, List::of)).doesNotThrowAnyException();
        assertThatCode(() -> ReviewChecklist.require(ActorKind.AGENT,
                card(Status.REVIEW, Executor.AI, List.of()), Status.TODO, List::of)).doesNotThrowAnyException();
    }

    @Test
    void theReviewStartsAtItsLastMoveIntoReview() {
        Instant created = REVIEW.minusSeconds(3600);
        List<DeliveryFlow.Move> moves = List.of(
                new DeliveryFlow.Move(UUID.randomUUID(), Status.REVIEW, REVIEW.minusSeconds(600), null),
                new DeliveryFlow.Move(UUID.randomUUID(), Status.REVIEW, REVIEW, null));
        assertThat(ReviewChecklist.reviewStart(created, moves)).isEqualTo(REVIEW);
        assertThat(ReviewChecklist.reviewStart(created, List.of())).isEqualTo(created);
    }
}
