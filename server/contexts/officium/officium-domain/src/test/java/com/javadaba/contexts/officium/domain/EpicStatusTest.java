package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.List;

import static com.javadaba.contexts.officium.domain.Status.DEPLOY;
import static com.javadaba.contexts.officium.domain.Status.DOING;
import static com.javadaba.contexts.officium.domain.Status.DONE;
import static com.javadaba.contexts.officium.domain.Status.READY;
import static com.javadaba.contexts.officium.domain.Status.REFINE;
import static com.javadaba.contexts.officium.domain.Status.REJECTED;
import static com.javadaba.contexts.officium.domain.Status.REVIEW;
import static com.javadaba.contexts.officium.domain.Status.TODO;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-379: an epic's status derives from its children, and it can't close while one is open. */
class EpicStatusTest {

    @Test
    void aChildlessEpicIsRefined() {
        assertThat(EpicStatus.derive(List.of())).isEqualTo(REFINE);
    }

    @Test
    void anEpicSitsWithItsLowestOpenChild() {
        assertThat(EpicStatus.derive(List.of(TODO, REFINE))).isEqualTo(REFINE);
        assertThat(EpicStatus.derive(List.of(REVIEW, DEPLOY))).isEqualTo(REVIEW);
        assertThat(EpicStatus.derive(List.of(DEPLOY, DONE))).isEqualTo(DEPLOY);
    }

    @Test
    void anEpicIsInProgressOnceAnyChildHasStarted() {
        assertThat(EpicStatus.derive(List.of(REFINE, DOING))).isEqualTo(DOING);
        assertThat(EpicStatus.derive(List.of(TODO, REVIEW))).isEqualTo(DOING);
        assertThat(EpicStatus.derive(List.of(TODO, DONE))).isEqualTo(DOING);
        // Raised, never lowered: open children all past In progress keep the epic there.
        assertThat(EpicStatus.derive(List.of(READY, REVIEW))).isEqualTo(READY);
    }

    @Test
    void everyChildDoneSendsTheEpicToReviewNotDone() {
        assertThat(EpicStatus.derive(List.of(DONE, DONE))).isEqualTo(REVIEW);
    }

    @Test
    void anEpicAlreadyWhereItsChildrenPutItStays() {
        assertThat(EpicStatus.follow(DOING, List.of(TODO, DOING))).isEmpty();
        assertThat(EpicStatus.follow(TODO, List.of(TODO, DOING))).contains(DOING);
    }

    @Test
    void anEpicAPersonClosedAfterItsChildrenStaysClosed() {
        assertThat(EpicStatus.follow(DEPLOY, List.of(DONE, DONE))).isEmpty();
        assertThat(EpicStatus.follow(DONE, List.of(DONE))).isEmpty();
        assertThat(EpicStatus.follow(DONE, List.of())).isEmpty();
    }

    @Test
    void aChildThatReopensOrANewChildPullsAClosedEpicBack() {
        assertThat(EpicStatus.follow(DONE, List.of(DONE, TODO))).contains(DOING);
        assertThat(EpicStatus.follow(DEPLOY, List.of(REFINE))).contains(REFINE);
    }

    @Test
    void anOpenEpicThatLosesItsLastChildGoesBackToRefine() {
        assertThat(EpicStatus.follow(DOING, List.of())).contains(REFINE);
    }

    @Test
    void closingAnEpicWithOpenChildrenNamesHowManyAreOpen() {
        assertThatThrownBy(() -> EpicStatus.requireManualMove(DOING, List.of(DONE, TODO, DOING), DONE))
                .isInstanceOfSatisfying(OfficiumException.class,
                        e -> assertThat(e.code()).isEqualTo("epic_children_open"))
                .hasMessageContaining("2 of its 3 children are still open");
    }

    @ParameterizedTest
    @EnumSource(value = Status.class, names = {"REFINE", "TODO", "DOING", "READY", "REVIEW", "DEPLOY"})
    void anyOtherMoveOfAnEpicWithOpenChildrenIsDerived(Status target) {
        assertThatThrownBy(() -> EpicStatus.requireManualMove(DOING, List.of(DONE, TODO), target))
                .isInstanceOfSatisfying(OfficiumException.class,
                        e -> assertThat(e.code()).isEqualTo("epic_status_derived"));
    }

    @ParameterizedTest
    @EnumSource(value = Status.class, names = {"REFINE", "TODO", "DOING", "READY"})
    void anEpicWhoseChildrenAreAllDoneStillDoesNotGoBackToWork(Status target) {
        assertThatThrownBy(() -> EpicStatus.requireManualMove(REVIEW, List.of(DONE), target))
                .isInstanceOfSatisfying(OfficiumException.class,
                        e -> assertThat(e.code()).isEqualTo("epic_status_derived"));
    }

    @ParameterizedTest
    @EnumSource(value = Status.class, names = {"REVIEW", "DEPLOY", "DONE"})
    void anEpicWhoseChildrenAreAllDoneMovesByHandBetweenReviewDeployAndDone(Status target) {
        assertThatCode(() -> EpicStatus.requireManualMove(REVIEW, List.of(DONE, DONE), target))
                .doesNotThrowAnyException();
    }

    @Test
    void aChildlessEpicIsLeftToTheChildlessRule() {
        assertThatCode(() -> EpicStatus.requireManualMove(REFINE, List.of(), DONE)).doesNotThrowAnyException();
    }

    // ── rejected children and rejected epics (card://JAVA-1415) ─────────────────────────────────

    @Test
    void aRejectedChildNeverPullsItsEpic() {
        assertThat(EpicStatus.derive(List.of(REJECTED, TODO))).isEqualTo(TODO);
        // Declared after done, a rejected child would otherwise read as "started".
        assertThat(EpicStatus.derive(List.of(REJECTED, REFINE))).isEqualTo(REFINE);
        assertThat(EpicStatus.derive(List.of(REJECTED, DONE))).isEqualTo(REVIEW);
    }

    @Test
    void anEpicWhoseChildrenAreAllRejectedIsPlannedAgain() {
        assertThat(EpicStatus.derive(List.of(REJECTED, REJECTED))).isEqualTo(REFINE);
        assertThat(EpicStatus.follow(REVIEW, List.of(REJECTED))).contains(REFINE);
    }

    @Test
    void aClosedEpicStaysWhereAPersonPutItWhileNoChildIsOpen() {
        assertThat(EpicStatus.follow(REJECTED, List.of(DONE, REJECTED))).isEmpty();
        assertThat(EpicStatus.follow(REJECTED, List.of())).isEmpty();
        assertThat(EpicStatus.follow(DEPLOY, List.of(DONE, REJECTED))).isEmpty();
        assertThat(EpicStatus.follow(DONE, List.of(REJECTED))).isEmpty();
    }

    @Test
    void aChildReopenedUnderARejectedEpicPullsItBack() {
        assertThat(EpicStatus.follow(REJECTED, List.of(REJECTED, TODO))).contains(TODO);
    }

    @Test
    void anEpicIsRejectedOnlyOnceNoChildIsOpen() {
        assertThatThrownBy(() -> EpicStatus.requireManualMove(DOING, List.of(DONE, TODO, DOING), REJECTED))
                .isInstanceOfSatisfying(OfficiumException.class,
                        e -> assertThat(e.code()).isEqualTo("epic_children_open"))
                .hasMessageContaining("finish or reject its 2 open children first");
        assertThatCode(() -> EpicStatus.requireManualMove(REVIEW, List.of(DONE, REJECTED), REJECTED))
                .doesNotThrowAnyException();
    }

    @Test
    void aRejectedChildIsClosedForClosingItsEpic() {
        assertThatCode(() -> EpicStatus.requireManualMove(REVIEW, List.of(DONE, REJECTED), DONE))
                .doesNotThrowAnyException();
    }

    @Test
    void aRejectedEpicIsLeftToTheRejectionRules() {
        assertThatCode(() -> EpicStatus.requireManualMove(REJECTED, List.of(DONE), REFINE)).doesNotThrowAnyException();
    }
}
