package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1416: what a send-back is, and what it must carry. */
class ReviewReturnsTest {

    private static final List<String> ROLES = List.of("backend-developer", "frontend-developer");

    private static ReviewReturns.Request request(List<String> reasons, String findings, String role) {
        return new ReviewReturns.Request(reasons, findings, role);
    }

    @Test
    void onlyAMoveFromReviewOrDeployBackToAWorkPhaseIsASendBack() {
        for (Status from : List.of(Status.REVIEW, Status.DEPLOY)) {
            for (Status to : List.of(Status.REFINE, Status.TODO, Status.DOING, Status.READY)) {
                assertThat(ReviewReturns.isSendBack(from, to)).as(from + " to " + to).isTrue();
            }
        }
        assertThat(ReviewReturns.isSendBack(Status.DEPLOY, Status.REVIEW)).isFalse();
        assertThat(ReviewReturns.isSendBack(Status.REVIEW, Status.REJECTED)).isFalse();
        assertThat(ReviewReturns.isSendBack(Status.REVIEW, Status.DEPLOY)).isFalse();
        assertThat(ReviewReturns.isSendBack(Status.DONE, Status.TODO)).isFalse();
        assertThat(ReviewReturns.isSendBack(Status.READY, Status.TODO)).isFalse();
        assertThat(ReviewReturns.isSendBack(Status.DOING, Status.REVIEW)).isFalse();
    }

    @Test
    void aSendBackWithoutAReviewReturnIsRefusedInWords() {
        assertThatThrownBy(() -> ReviewReturns.require(Status.REVIEW, Status.DOING, null, ActorKind.PERSON, ROLES))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("review_return_required"))
                .hasMessageContaining("acceptance-unmet");
    }

    @Test
    void aReviewReturnOnAMoveThatIsNotASendBackIsRefused() {
        assertThatThrownBy(() -> ReviewReturns.require(Status.DOING, Status.REVIEW,
                request(List.of("other"), "x", null), ActorKind.PERSON, ROLES))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("review_return_without_send_back"));
        assertThat(ReviewReturns.require(Status.DOING, Status.REVIEW, null, ActorKind.PERSON, ROLES)).isEmpty();
    }

    @Test
    void reasonsAreAtLeastOneFromTheClosedListAndNeverRepeated() {
        assertCode(request(List.of(), "x", null), "review_return_reason_required");
        assertCode(request(null, "x", null), "review_return_reason_required");
        assertCode(request(List.of("nope"), "x", null), "review_return_reason_invalid");
        assertCode(request(List.of("regression", "regression"), "x", null), "review_return_reason_repeated");

        ReviewReturns.Checked checked = ReviewReturns.require(Status.REVIEW, Status.TODO,
                request(List.of("regression", "integration-failed"), "  it broke  ", null), ActorKind.PERSON, ROLES)
                .orElseThrow();
        assertThat(checked.reasons()).containsExactly(ReviewReturnReason.REGRESSION,
                ReviewReturnReason.INTEGRATION_FAILED);
        assertThat(checked.findings()).isEqualTo("it broke");
        assertThat(checked.role()).isNull();
    }

    @Test
    void findingsAreRequiredAndBounded() {
        assertCode(request(List.of("other"), " ", null), "review_return_findings_required");
        assertCode(request(List.of("other"), "x".repeat(ReviewReturns.FINDINGS_MAX + 1), null),
                "review_return_findings_too_long");
    }

    @Test
    void anAgentNamesTheRoleItReviewedAsOneOfTheEligibleOnes() {
        assertThatThrownBy(() -> ReviewReturns.require(Status.REVIEW, Status.DOING,
                request(List.of("other"), "x", null), ActorKind.AGENT, ROLES))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("review_return_role_required"))
                .hasMessageContaining("backend-developer");
        assertThatThrownBy(() -> ReviewReturns.require(Status.REVIEW, Status.DOING,
                request(List.of("other"), "x", "qa-lead"), ActorKind.AGENT, ROLES))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("review_return_role_invalid"));

        assertThat(ReviewReturns.require(Status.REVIEW, Status.DOING,
                request(List.of("other"), "x", "frontend-developer"), ActorKind.AGENT, ROLES).orElseThrow().role())
                .isEqualTo("frontend-developer");
        // No role is eligible at that status: any well-formed id passes.
        assertThat(ReviewReturns.require(Status.REVIEW, Status.DOING,
                request(List.of("other"), "x", "qa-lead"), ActorKind.AGENT, List.of()).orElseThrow().role())
                .isEqualTo("qa-lead");
    }

    private static void assertCode(ReviewReturns.Request request, String code) {
        assertThatThrownBy(() -> ReviewReturns.require(Status.REVIEW, Status.DOING, request, ActorKind.PERSON, ROLES))
                .isInstanceOfSatisfying(OfficiumException.class, ex -> assertThat(ex.code()).isEqualTo(code));
    }
}
