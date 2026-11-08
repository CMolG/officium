package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1526: what every exit from review records, and what an agent's approval must carry. */
class ReviewQualityTest {

    private static final List<String> ROLES = List.of("code-reviewer", "acceptance-qa");
    private static final Map<String, String> CLEAN = Map.of("architecture", "clean", "clean_code", "clean",
            "testing_rigor", "minor_observations", "runtime_guardrails", "clean", "role", "code-reviewer");

    private static Card card(Status status, Executor executor, List<Signal> signals) {
        return card(status, executor, signals, Category.FEATURE);
    }

    private static Card card(Status status, Executor executor, List<Signal> signals, Category category) {
        Instant now = Instant.EPOCH;
        return new Card(UUID.randomUUID(), UUID.randomUUID(), "OFF-1", 1, "Snake effect", null, null, status,
                RunState.IDLE, Priority.MEDIUM, executor, category, 0, 0, null, List.of(), List.of(), 1, now,
                now, Actor.agent(UUID.randomUUID(), "claude"), Actor.agent(UUID.randomUUID(), "claude"), null, null,
                null, null, 0, signals, null);
    }

    private static Card inReview() {
        return card(Status.REVIEW, Executor.AI, List.of());
    }

    @Test
    void anAgentsApprovalOfAnAiCardCarriesItsScorecardAndRole() {
        assertThatThrownBy(() -> ReviewQuality.require(inReview(), Status.DEPLOY, null, ActorKind.AGENT, ROLES, null))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("contract_unmet"))
                .hasMessageContaining("qualityScorecard").hasMessageContaining("architecture, clean_code");

        ReviewQuality.Checked checked = ReviewQuality.require(inReview(), Status.DEPLOY,
                new ReviewQuality.Request(null, CLEAN), ActorKind.AGENT, ROLES, null).orElseThrow();
        assertThat(checked.verdict()).isEqualTo(ReviewOutcome.Verdict.APPROVED);
        assertThat(checked.role()).isEqualTo("code-reviewer");
        assertThat(checked.scorecard()).containsEntry(QualityDimension.TESTING_RIGOR,
                ReviewOutcome.Score.MINOR_OBSERVATIONS).doesNotContainKey(QualityDimension.UX_AND_POLISH);
    }

    @Test
    void aCardTouchingTheUiIsScoredOnItsFinishToo() {
        Card ui = card(Status.REVIEW, Executor.AI, List.of(Signal.TOUCHES_UI));
        assertThatThrownBy(() -> ReviewQuality.require(ui, Status.DEPLOY, new ReviewQuality.Request(null, CLEAN),
                ActorKind.AGENT, ROLES, null))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("quality_scorecard_incomplete"))
                .hasMessageContaining("ux_and_polish");
    }

    @Test
    void aPersonsApprovalNeedsNoScorecardAndIsStillAnOutcome() {
        ReviewQuality.Checked checked = ReviewQuality.require(inReview(), Status.DONE, null, ActorKind.PERSON, ROLES,
                null).orElseThrow();
        assertThat(checked.verdict()).isEqualTo(ReviewOutcome.Verdict.APPROVED);
        assertThat(checked.scorecard()).isEmpty();
        assertThat(ReviewQuality.require(card(Status.REVIEW, Executor.HUMAN, List.of()), Status.DEPLOY, null,
                ActorKind.AGENT, ROLES, null)).isPresent();
    }

    @Test
    void aSendBackKeepsTheRulesItBrokeAndRefusesOnesOutsideTheVocabulary() {
        ReviewQuality.Checked checked = ReviewQuality.require(inReview(), Status.TODO,
                new ReviewQuality.Request(List.of("architecture:layer-violation", "clean_code:solid-srp"), null),
                ActorKind.AGENT, ROLES, "code-reviewer").orElseThrow();
        assertThat(checked.verdict()).isEqualTo(ReviewOutcome.Verdict.SENT_BACK);
        assertThat(QualityRule.ids(checked.ruleViolations()))
                .containsExactly("architecture:layer-violation", "clean_code:solid-srp");
        assertThat(checked.role()).isEqualTo("code-reviewer");

        assertThatThrownBy(() -> ReviewQuality.require(inReview(), Status.TODO,
                new ReviewQuality.Request(List.of("clean_code:spaghetti"), null), ActorKind.AGENT, ROLES, null))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("quality_rule_unknown"));
    }

    @Test
    void eachHalfGoesOnlyWithItsOwnExit() {
        assertThatThrownBy(() -> ReviewQuality.require(card(Status.DOING, Executor.AI, List.of()), Status.REVIEW,
                new ReviewQuality.Request(List.of("architecture:layer-violation"), null), ActorKind.AGENT, ROLES,
                null)).isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("rule_violations_without_send_back"));
        assertThatThrownBy(() -> ReviewQuality.require(card(Status.DOING, Executor.AI, List.of()), Status.REVIEW,
                new ReviewQuality.Request(null, CLEAN), ActorKind.AGENT, ROLES, null))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("quality_scorecard_without_approval"));
        assertThat(ReviewQuality.require(card(Status.DEPLOY, Executor.AI, List.of()), Status.DONE, null,
                ActorKind.AGENT, ROLES, null)).isEmpty();
    }

    @Test
    void anEpicMovingOnWithItsChildrenIsNoReviewOfWork() {
        assertThat(ReviewQuality.require(card(Status.REVIEW, Executor.AI, List.of(), Category.EPIC), Status.DEPLOY,
                null, ActorKind.AGENT, ROLES, null)).isEmpty();
    }

    @Test
    void anUnknownScoreOrRoleIsRefusedInWords() {
        assertThatThrownBy(() -> ReviewQuality.require(inReview(), Status.DEPLOY, new ReviewQuality.Request(null,
                Map.of("architecture", "great")), ActorKind.PERSON, ROLES, null))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("quality_score_invalid"));
        Map<String, String> wrongRole = new java.util.HashMap<>(CLEAN);
        wrongRole.put("role", "backend-developer");
        assertThatThrownBy(() -> ReviewQuality.require(inReview(), Status.DEPLOY,
                new ReviewQuality.Request(null, wrongRole), ActorKind.AGENT, ROLES, null))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("quality_scorecard_role_invalid"));
    }
}
