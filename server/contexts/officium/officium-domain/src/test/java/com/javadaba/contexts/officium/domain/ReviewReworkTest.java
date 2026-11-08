package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1443: the third send-back from review escalates to refine; the fourth arrival is refused. */
class ReviewReworkTest {

    private static final UUID CARD = UUID.randomUUID();
    private static final Actor REVIEWER = Actor.agent(UUID.randomUUID(), "reviewer");

    private static ReviewReturn sentBack(Status from, Status to, String... reasons) {
        List<ReviewReturnReason> wires = java.util.Arrays.stream(reasons).map(ReviewReturnReason::fromWire).toList();
        return new ReviewReturn(UUID.randomUUID(), UUID.randomUUID(), CARD, Instant.now(), REVIEWER,
                "backend-developer",
                from, to, wires, null);
    }

    private static List<ReviewReturn> rounds(int count) {
        return java.util.stream.IntStream.range(0, count)
                .mapToObj(i -> sentBack(Status.REVIEW, Status.TODO, "acceptance-unmet")).toList();
    }

    @Test
    void theCapIsThreeSendBacks() {
        assertThat(ReviewRework.CAP).isEqualTo(3);
    }

    @Test
    void theStreakCountsOnlySendBacksFromReviewToAWorkPhase() {
        assertThat(ReviewRework.streak(rounds(2))).isEqualTo(2);
        List<ReviewReturn> mixed = List.of(sentBack(Status.REVIEW, Status.DOING, "tests-missing-or-red"),
                sentBack(Status.REVIEW, Status.READY, "regression"));
        assertThat(ReviewRework.streak(mixed)).isEqualTo(2);
    }

    @Test
    void aSendBackToRefineResetsTheStreak() {
        List<ReviewReturn> history = List.of(sentBack(Status.REVIEW, Status.TODO, "scope-drift"),
                sentBack(Status.REVIEW, Status.REFINE, "contract-unmet"),
                sentBack(Status.REVIEW, Status.TODO, "other"));
        assertThat(ReviewRework.streak(history)).isEqualTo(1);
    }

    @Test
    void aSendBackFromDeployIsNotCountedAndResetsTheStreak() {
        List<ReviewReturn> history = List.of(sentBack(Status.REVIEW, Status.TODO, "other"),
                sentBack(Status.REVIEW, Status.TODO, "other"), sentBack(Status.DEPLOY, Status.TODO, "regression"));
        assertThat(ReviewRework.streak(history)).isZero();
    }

    @Test
    void roundsOneAndTwoKeepTheStatusAsked() {
        assertThat(ReviewRework.route(Status.REVIEW, Status.TODO, rounds(0)))
                .isEqualTo(new ReviewRework.Landing(Status.TODO, false));
        assertThat(ReviewRework.route(Status.REVIEW, Status.DOING, rounds(1)))
                .isEqualTo(new ReviewRework.Landing(Status.DOING, false));
    }

    @Test
    void roundThreeAskedForAWorkPhaseLandsInRefine() {
        for (Status asked : List.of(Status.TODO, Status.DOING, Status.READY)) {
            assertThat(ReviewRework.route(Status.REVIEW, asked, rounds(2)))
                    .as("asked " + asked).isEqualTo(new ReviewRework.Landing(Status.REFINE, true));
        }
    }

    @Test
    void roundThreeAskedForRefineStaysInRefineWithoutEscalating() {
        assertThat(ReviewRework.route(Status.REVIEW, Status.REFINE, rounds(2)))
                .isEqualTo(new ReviewRework.Landing(Status.REFINE, false));
    }

    @Test
    void aDeploySendBackIsNeverRerouted() {
        assertThat(ReviewRework.route(Status.DEPLOY, Status.TODO, rounds(2)))
                .isEqualTo(new ReviewRework.Landing(Status.TODO, false));
    }

    @Test
    void theNoteNamesTheReasonsThatRecurred() {
        List<ReviewReturn> prior = List.of(
                sentBack(Status.REVIEW, Status.TODO, "acceptance-unmet", "tests-missing-or-red"),
                sentBack(Status.REVIEW, Status.TODO, "acceptance-unmet"));
        String note = ReviewRework.escalation(prior, List.of(ReviewReturnReason.fromWire("acceptance-unmet"),
                ReviewReturnReason.fromWire("design-or-ux")));
        assertThat(note).contains("Escalated to refine").contains("3 times in a row")
                .contains("Recurring reasons: acceptance-unmet.");
    }

    @Test
    void theNoteSaysSoWhenNoReasonRecurred() {
        String note = ReviewRework.escalation(rounds(2), List.of(ReviewReturnReason.fromWire("design-or-ux")));
        assertThat(note).contains("No reason recurred across the rounds");
    }

    @Test
    void aCardAtTheCapInReviewIsStuckSoNextNeverHandsItOut() {
        assertThat(ReviewRework.stuck(Status.REVIEW, rounds(3))).isTrue();
        assertThat(ReviewRework.stuck(Status.REVIEW, rounds(2))).isFalse();
        assertThat(ReviewRework.stuck(Status.TODO, rounds(3))).isFalse();
    }

    @Test
    void anArrivalInReviewIsRefusedAtTheCapAndAllowedBelowIt() {
        ReviewRework.requireRoomToReview(Status.REVIEW, rounds(2));
        assertThatThrownBy(() -> ReviewRework.requireRoomToReview(Status.REVIEW, rounds(3)))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("review_rework_cap"));
    }
}
