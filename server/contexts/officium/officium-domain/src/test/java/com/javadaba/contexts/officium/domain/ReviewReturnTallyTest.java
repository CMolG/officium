package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1416: the period's send-backs by reason and category, and the first-time pass share. */
class ReviewReturnTallyTest {

    private static final UUID PROJECT = UUID.randomUUID();
    private static final Instant START = Instant.parse("2026-10-01T00:00:00Z");
    private static final Instant END = Instant.parse("2026-10-15T00:00:00Z");
    private static final Actor AGENT = Actor.agent(UUID.randomUUID(), "Agent");

    @Test
    void aReturnWithSeveralReasonsCountsOnceForEachAndOnceForItsCategory() {
        Card bug = card(Category.BUG);
        Card none = card(null);
        List<ReviewReturn> returns = List.of(
                back(bug, "2026-10-02T00:00:00Z", ReviewReturnReason.REGRESSION,
                        ReviewReturnReason.TESTS_MISSING_OR_RED),
                back(bug, "2026-10-03T00:00:00Z", ReviewReturnReason.REGRESSION),
                back(none, "2026-10-04T00:00:00Z", ReviewReturnReason.OTHER));

        ReviewReturnTally tally = ReviewReturnTally.of(Map.of(bug.id(), bug, none.id(), none), returns, List.of(),
                START, END);

        assertThat(tally.total()).isEqualTo(3);
        assertThat(tally.byReason()).containsExactly(
                new ReviewReturnTally.ByReason(ReviewReturnReason.REGRESSION, 2),
                new ReviewReturnTally.ByReason(ReviewReturnReason.TESTS_MISSING_OR_RED, 1),
                new ReviewReturnTally.ByReason(ReviewReturnReason.OTHER, 1));
        assertThat(tally.byCategory()).containsExactly(new ReviewReturnTally.ByCategory(Category.BUG, 2),
                new ReviewReturnTally.ByCategory(null, 1));
    }

    @Test
    void onlyReturnsInThePeriodCount() {
        Card card = card(Category.BUG);
        List<ReviewReturn> returns = List.of(back(card, "2026-09-30T23:59:59Z", ReviewReturnReason.OTHER),
                back(card, "2026-10-01T00:00:00Z", ReviewReturnReason.OTHER),
                back(card, "2026-10-15T00:00:00Z", ReviewReturnReason.OTHER));

        assertThat(ReviewReturnTally.of(Map.of(card.id(), card), returns, List.of(), START, END).total()).isEqualTo(1);
    }

    @Test
    void aCardPassesFirstTimeWhenItWasNeverSentBackBeforeItsFirstArrivalAtDeployOrDone() {
        Card clean = card(Category.FEATURE);
        Card bounced = card(Category.FEATURE);
        Card stillOpen = card(Category.FEATURE);
        Card neverReviewed = card(Category.FEATURE);
        List<DeliveryFlow.Move> moves = List.of(
                move(clean, Status.REVIEW, "2026-10-02T00:00:00Z"), move(clean, Status.DEPLOY, "2026-10-03T00:00:00Z"),
                move(bounced, Status.REVIEW, "2026-10-02T00:00:00Z"),
                move(bounced, Status.DOING, "2026-10-03T00:00:00Z"),
                move(bounced, Status.REVIEW, "2026-10-04T00:00:00Z"),
                move(bounced, Status.DEPLOY, "2026-10-05T00:00:00Z"),
                move(bounced, Status.DONE, "2026-10-06T00:00:00Z"),
                move(stillOpen, Status.REVIEW, "2026-10-02T00:00:00Z"),
                move(neverReviewed, Status.TODO, "2026-10-02T00:00:00Z"),
                move(neverReviewed, Status.DONE, "2026-10-03T00:00:00Z"));
        List<ReviewReturn> returns = List.of(back(bounced, "2026-10-03T00:00:00Z", ReviewReturnReason.OTHER),
                back(stillOpen, "2026-10-03T00:00:00Z", ReviewReturnReason.OTHER));

        ReviewReturnTally tally = ReviewReturnTally.of(
                Map.of(clean.id(), clean, bounced.id(), bounced, stillOpen.id(), stillOpen, neverReviewed.id(),
                        neverReviewed),
                returns, moves, START,
                END);

        assertThat(tally.firstTimePass()).isEqualTo(new ReviewReturnTally.FirstTimePass(2, 1, 0.5));
    }

    @Test
    void nothingPassedHasNoShare() {
        assertThat(ReviewReturnTally.of(Map.of(), List.of(), List.of(), START, END).firstTimePass())
                .isEqualTo(new ReviewReturnTally.FirstTimePass(0, 0, null));
    }

    private static DeliveryFlow.Move move(Card card, Status to, String at) {
        return new DeliveryFlow.Move(card.id(), to, Instant.parse(at), AGENT);
    }

    private static ReviewReturn back(Card card, String at, ReviewReturnReason... reasons) {
        return new ReviewReturn(UUID.randomUUID(), PROJECT, card.id(), Instant.parse(at), AGENT, null, Status.REVIEW,
                Status.DOING, List.of(reasons), null);
    }

    private static Card card(Category category) {
        Instant at = Instant.parse("2026-09-01T10:00:00Z");
        return new Card(UUID.randomUUID(), PROJECT, "JAVA-1", 1, "Title", null, null, Status.REVIEW, RunState.IDLE,
                Priority.MEDIUM, Executor.AI, category, 0, 0, null, List.of(), List.of(), 1, at, at,
                AGENT, AGENT, null, null, null, null, 0, List.of(), null, null);
    }
}
