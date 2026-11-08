package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1527: who a review exit, a send-back, an escaped defect and an hour are laid on. */
class ProfileTallyTest {

    private static final UUID PROJECT = UUID.randomUUID();
    private static final Actor AGENT = Actor.agent(UUID.randomUUID(), "Claude Code (t)");
    private static final Instant T0 = Instant.parse("2026-10-10T10:00:00Z");
    private static final String HAIKU = "claude-haiku-5-5";
    private static final String SONNET = "claude-sonnet-5-5";
    private static final QualityRule LAYER = QualityRule.find("architecture:layer-violation").orElseThrow();
    private static final QualityRule TAUTOLOGY = QualityRule.find("testing_rigor:tautological-test").orElseThrow();

    private final List<PhaseRun> runs = new ArrayList<>();
    private final List<ReviewOutcome> outcomes = new ArrayList<>();
    private final List<ReviewReturn> returns = new ArrayList<>();

    private static Instant at(int minutes) {
        return T0.plus(Duration.ofMinutes(minutes));
    }

    /** A review that sent the card back for {@code reason}, with no rule violation: the send-back measure's case. */
    private void sentBack(String profile, int minute, ReviewReturnReason reason) {
        UUID card = UUID.randomUUID();
        UUID send = UUID.randomUUID();
        run(card, Status.DOING, Status.REVIEW, minute - 1, profile, HAIKU);
        run(card, Status.REVIEW, Status.DOING, minute, profile, SONNET);
        returns.add(new ReviewReturn(send, PROJECT, card, at(minute), AGENT, "code-reviewer", Status.REVIEW,
                Status.DOING, List.of(reason), null));
        outcomes.add(new ReviewOutcome(UUID.randomUUID(), PROJECT, card, at(minute), AGENT, "code-reviewer",
                Status.REVIEW, Status.DOING, ReviewOutcome.Verdict.SENT_BACK, List.of(), Map.of(), null, send));
    }

    private void run(UUID card, Status from, Status to, int minute, String profile, String model) {
        runs.add(new PhaseRun(UUID.randomUUID(), PROJECT, card, at(minute), ActorKind.AGENT, from, to,
                Category.FEATURE, profile, "backend-developer", model, "medium"));
    }

    /** A card built under {@code profile}'s Action model and reviewed by Sonnet at {@code minute}. */
    private UUID reviewed(String profile, String model, int minute, List<QualityRule> violations) {
        UUID card = UUID.randomUUID();
        run(card, Status.DOING, Status.REVIEW, minute - 1, profile, model);
        boolean approved = violations.isEmpty();
        Status to = approved ? Status.DEPLOY : Status.DOING;
        run(card, Status.REVIEW, to, minute, profile, SONNET);
        outcomes.add(new ReviewOutcome(UUID.randomUUID(), PROJECT, card, at(minute), AGENT, "code-reviewer",
                Status.REVIEW, to, approved ? ReviewOutcome.Verdict.APPROVED : ReviewOutcome.Verdict.SENT_BACK,
                violations, Map.of(), null, null));
        return card;
    }

    private ProfileTally.View tally(List<EscapedDefect> defects, List<CardTimeEntry> time) {
        return ProfileTally.of(new ProfileTally.Input(Map.of(), runs, outcomes, returns, defects, time, T0,
                at(10_000), Set.of()), ProfileRecommendationSettings.DEFAULTS);
    }

    /** E6: a cell whose reviews break no rule, yet sends most cards back for testing or UX reasons, is asked too. */
    @Test
    void aCellSentBackOverTheBarIsAskedEvenWithNoRuleViolation() {
        for (int i = 0; i < 4; i++) {
            sentBack(WorkProfiles.ECO, 10 + i * 10, ReviewReturnReason.TESTS_MISSING_OR_RED);
        }
        reviewed(WorkProfiles.ECO, HAIKU, 60, List.of());

        ProfileTally.View view = tally(List.of(), List.of());

        assertThat(view.recommendations()).singleElement().satisfies(r -> {
            assertThat(r.firedBy()).containsExactly(ProfileTally.SEND_BACKS);
            assertThat(r.violating()).isZero();
            assertThat(r.sentBack()).isEqualTo(4);
            assertThat(r.sendBackRate()).isEqualTo(0.8);
        });
    }

    /** card://JAVA-1884: Eco runs on Sonnet only, so its over-the-bar Sonnet cell is never asked to move to Opus. */
    @Test
    void anEcoCellIsNeverAskedForAModelOtherThanSonnet() {
        for (int i = 0; i < 4; i++) {
            reviewed(WorkProfiles.ECO, SONNET, 10 + i * 10, List.of(LAYER));
            reviewed(WorkProfiles.STANDARD, SONNET, 15 + i * 10, List.of(LAYER));
        }
        reviewed(WorkProfiles.ECO, SONNET, 60, List.of());
        reviewed(WorkProfiles.STANDARD, SONNET, 65, List.of());

        ProfileTally.View view = tally(List.of(), List.of());

        assertThat(view.recommendations()).singleElement().satisfies(r -> {
            assertThat(r.profileId()).isEqualTo(WorkProfiles.STANDARD);
            assertThat(r.raiseTo()).isEqualTo("claude-opus-5-5");
        });
    }

    /** E3: a send-back that only the integration caused says nothing about the author, so it does not count. */
    @Test
    void anIntegrationOnlySendBackIsNotCountedAgainstTheCell() {
        for (int i = 0; i < ProfileTally.MIN_REVIEWED; i++) {
            sentBack(WorkProfiles.ECO, 10 + i * 10, ReviewReturnReason.INTEGRATION_FAILED);
        }

        ProfileTally.View view = tally(List.of(), List.of());

        assertThat(view.cells()).singleElement().satisfies(c -> assertThat(c.sentBack()).isZero());
        assertThat(view.recommendations()).isEmpty();
    }

    /** Two clean deliveries under Standard, one of which recorded tokens: the average is that card's, not half. */
    @Test
    void aCleanDeliveryAveragesOnlyTheTokensOfTheDeliveriesThatRecordedThem() {
        UUID withTokens = reviewed(WorkProfiles.STANDARD, SONNET, 10, List.of());
        reviewed(WorkProfiles.STANDARD, SONNET, 20, List.of());
        CardTimeEntry session = new CardTimeEntry(UUID.randomUUID(), withTokens, LocalDate.of(2026, 10, 10), 1,
                "Claude Code (t)", null, null, T0, TimeSource.AGENT_SESSION, TimeConcept.WORK, SONNET, "medium",
                new TokenUsage(1000, 0, 0, 200), null, null, null, null).withProfile(WorkProfiles.STANDARD);

        ProfileTally.View view = ProfileTally.of(new ProfileTally.Input(Map.of(), runs, outcomes, List.of(), List.of(),
                List.of(session), T0, at(10_000), Set.of(withTokens)), ProfileRecommendationSettings.DEFAULTS);

        ProfileTally.Cost cost = view.byProfile().stream().filter(r -> r.profileId().equals(WorkProfiles.STANDARD))
                .findFirst().orElseThrow().cost();
        assertThat(cost.cleanDeliveries()).isEqualTo(2);
        assertThat(cost.cleanWithTokens()).isEqualTo(1);
        assertThat(cost.tokensPerCleanDelivery().tokensIn()).isEqualTo(1000);
        assertThat(cost.tokensPerCleanDelivery().tokensOut()).isEqualTo(200);
    }

    @Test
    void anEcoCellOverTheBarIsAskedToRaiseItsModelAndACleanOneIsNot() {
        for (int i = 0; i < 5; i++) {
            reviewed(WorkProfiles.ECO, HAIKU, 10 + i * 10, i < 2 ? List.of(LAYER) : List.of());
        }
        for (int i = 0; i < 5; i++) {
            reviewed(WorkProfiles.STANDARD, SONNET, 200 + i * 10, i == 0 ? List.of(TAUTOLOGY) : List.of());
        }

        ProfileTally.View view = tally(List.of(), List.of());

        assertThat(view.recommendations()).singleElement().satisfies(r -> {
            assertThat(r.profileId()).isEqualTo(WorkProfiles.ECO);
            assertThat(r.model()).isEqualTo(HAIKU);
            assertThat(r.raiseTo()).isEqualTo(SONNET);
            assertThat(r.violationRate()).isEqualTo(0.4);
        });
        ProfileTally.Row eco = view.byProfile().stream().filter(r -> r.profileId().equals(WorkProfiles.ECO))
                .findFirst().orElseThrow();
        assertThat(eco.reviewed()).isEqualTo(5);
        assertThat(eco.firstTimePassRate()).isEqualTo(0.6);
        assertThat(eco.codeHealthRate()).isEqualTo(0.6);
        assertThat(eco.violationsByDimension()).containsEntry("architecture", 2);
        // Testing rigor is a violation, but not one of code health: Standard stays healthy.
        assertThat(view.byProfile()).filteredOn(r -> r.profileId().equals(WorkProfiles.STANDARD))
                .singleElement().satisfies(r -> assertThat(r.codeHealthRate()).isEqualTo(1.0));
        assertThat(view.reviewerCatch()).singleElement().satisfies(c -> {
            assertThat(c.model()).isEqualTo(SONNET);
            assertThat(c.caught()).isEqualTo(3);
        });
    }

    @Test
    void anEscapedDefectCostsItsOriginsProfileTheCorrectiveCardsTimeAndCountsAgainstItsReviewer() {
        UUID origin = reviewed(WorkProfiles.ECO, HAIKU, 10, List.of());
        UUID corrective = UUID.randomUUID();
        EscapedDefect defect = new EscapedDefect(UUID.randomUUID(), PROJECT, origin, corrective, "OFF-9", at(500),
                AGENT, EscapedPhase.REVIEW, QualityDimension.ARCHITECTURE, List.of(LAYER));
        CardTimeEntry fix = new CardTimeEntry(UUID.randomUUID(), corrective, LocalDate.of(2026, 10, 11), 2.0,
                "Claude Code (t)", null, null, at(600), TimeSource.AGENT_SESSION, TimeConcept.WORK, SONNET, "high",
                new TokenUsage(100, 0, 0, 50), at(540), at(600), "s", null, WorkProfiles.STANDARD);
        CardTimeEntry build = new CardTimeEntry(UUID.randomUUID(), origin, LocalDate.of(2026, 10, 10), 1.0,
                "Claude Code (t)", null, null, at(9), TimeSource.AGENT_SESSION, TimeConcept.WORK, HAIKU, "medium",
                new TokenUsage(10, 0, 0, 5), at(0), at(9), "s", null, WorkProfiles.ECO);

        ProfileTally.View view = tally(List.of(defect), List.of(fix, build));

        ProfileTally.Row eco = view.byProfile().stream().filter(r -> r.profileId().equals(WorkProfiles.ECO))
                .findFirst().orElseThrow();
        assertThat(eco.escapedByPhase()).containsEntry("review", 1);
        assertThat(eco.cost().hours()).isEqualTo(1.0);
        assertThat(eco.cost().debtHours()).isEqualTo(2.0);
        assertThat(eco.cost().debtTokens()).isEqualTo(new TokenUsage(100, 0, 0, 50));
        // Approved first time, but named by a defect: not a clean delivery.
        assertThat(eco.cost().cleanDeliveries()).isZero();
        assertThat(view.reviewerCatch()).singleElement().satisfies(c -> assertThat(c.escaped()).isEqualTo(1));
        assertThat(view.escapedDefects()).singleElement()
                .satisfies(e -> assertThat(e.correctiveKey()).isEqualTo("OFF-9"));
    }

    @Test
    void aCorrectiveCardUnderTheSameProfileIsItsOriginsDebtOnlyNotAlsoItsOwnTime() {
        UUID origin = reviewed(WorkProfiles.ECO, HAIKU, 10, List.of());
        UUID corrective = UUID.randomUUID();
        EscapedDefect defect = new EscapedDefect(UUID.randomUUID(), PROJECT, origin, corrective, "OFF-9", at(500),
                AGENT, EscapedPhase.ACTION, QualityDimension.ARCHITECTURE, List.of(LAYER));
        CardTimeEntry fix = new CardTimeEntry(UUID.randomUUID(), corrective, LocalDate.of(2026, 10, 11), 2.0,
                "Claude Code (t)", null, null, at(600), TimeSource.AGENT_SESSION, TimeConcept.WORK, HAIKU, "medium",
                new TokenUsage(100, 0, 0, 50), at(540), at(600), "s", null, WorkProfiles.ECO);

        ProfileTally.Row eco = tally(List.of(defect), List.of(fix)).byProfile().getFirst();

        assertThat(eco.cost().hours()).isZero();
        assertThat(eco.cost().debtHours()).isEqualTo(2.0);
    }

    @Test
    void aPhaseAPersonMovedTheCardOutOfIsNoProfilesWork() {
        UUID card = UUID.randomUUID();
        runs.add(new PhaseRun(UUID.randomUUID(), PROJECT, card, at(9), ActorKind.PERSON, Status.DOING, Status.REVIEW,
                Category.FEATURE, WorkProfiles.ECO, null, HAIKU, "medium"));
        outcomes.add(new ReviewOutcome(UUID.randomUUID(), PROJECT, card, at(10), AGENT, "code-reviewer",
                Status.REVIEW, Status.DOING, ReviewOutcome.Verdict.SENT_BACK, List.of(LAYER), Map.of(), null, null));

        assertThat(tally(List.of(), List.of()).byProfile()).isEmpty();
    }

    @Test
    void underTheMinimumSampleAViolatingCellIsNotAskedToRaiseItsModel() {
        for (int i = 0; i < ProfileTally.MIN_REVIEWED - 1; i++) {
            reviewed(WorkProfiles.ECO, HAIKU, 10 + i * 10, List.of(LAYER));
        }

        ProfileTally.View view = tally(List.of(), List.of());

        assertThat(view.cells()).singleElement().satisfies(c -> assertThat(c.violationRate()).isEqualTo(1.0));
        assertThat(view.recommendations()).isEmpty();
    }

    @Test
    void aCardWithNoPhaseRunIsLeftOutAndADefaultsRunIsKeyedAsSuch() {
        outcomes.add(new ReviewOutcome(UUID.randomUUID(), PROJECT, UUID.randomUUID(), at(5), AGENT, "code-reviewer",
                Status.REVIEW, Status.DEPLOY, ReviewOutcome.Verdict.APPROVED, List.of(), Map.of(), null, null));
        reviewed(null, SONNET, 20, List.of());

        ProfileTally.View view = tally(List.of(), List.of());

        assertThat(view.byProfile()).singleElement().satisfies(r -> {
            assertThat(r.profileId()).isEqualTo(ProfileTally.DEFAULTS);
            assertThat(r.reviewed()).isEqualTo(1);
            assertThat(r.cost().cleanDeliveries()).isEqualTo(1);
        });
    }

    /** One review exit that sent {@code card} back. {@code send} names its return; null names none (E7). */
    private void sendBackExit(UUID card, String profile, String model, int minute, List<QualityRule> violations,
            List<ReviewReturnReason> reasons, UUID send) {
        run(card, Status.DOING, Status.REVIEW, minute - 1, profile, model);
        run(card, Status.REVIEW, Status.DOING, minute, profile, SONNET);
        if (send != null) {
            returns.add(new ReviewReturn(send, PROJECT, card, at(minute), AGENT, "code-reviewer", Status.REVIEW,
                    Status.DOING, reasons, null));
        }
        outcomes.add(new ReviewOutcome(UUID.randomUUID(), PROJECT, card, at(minute), AGENT, "code-reviewer",
                Status.REVIEW, Status.DOING, ReviewOutcome.Verdict.SENT_BACK, violations, Map.of(), null, send));
    }

    /** A send-back by a new card, with a return that names {@code reasons}. */
    private void sendBack(String profile, String model, int minute, List<ReviewReturnReason> reasons) {
        sendBackExit(UUID.randomUUID(), profile, model, minute, List.of(), reasons, UUID.randomUUID());
    }

    private ProfileTally.View viewWith(ProfileRecommendationSettings settings) {
        return ProfileTally.of(new ProfileTally.Input(Map.of(), runs, outcomes, returns, List.of(), List.of(), T0,
                at(10_000), Set.of()), settings);
    }

    /** E1: a cell under the minimum sample is not asked, however many of its reviews were sent back. */
    @Test
    void aCellUnderTheMinimumSampleIsNotAskedEvenWhenEveryReviewSentItBack() {
        for (int i = 0; i < ProfileTally.MIN_REVIEWED - 1; i++) {
            sentBack(WorkProfiles.ECO, 10 + i * 10, ReviewReturnReason.TESTS_MISSING_OR_RED);
        }

        ProfileTally.View view = tally(List.of(), List.of());

        assertThat(view.cells()).singleElement().satisfies(c -> assertThat(c.sendBackRate()).isEqualTo(1.0));
        assertThat(view.recommendations()).isEmpty();
    }

    /** E2: the bar is inclusive: 3 of 10 sent back is asked at the default 0.30, 2 of 10 is not. */
    @Test
    void aSendBackRateExactlyOnTheBarIsAsked() {
        for (int i = 0; i < 3; i++) {
            sendBack(WorkProfiles.ECO, HAIKU, 10 + i * 10, List.of(ReviewReturnReason.TESTS_MISSING_OR_RED));
        }
        for (int i = 0; i < 7; i++) {
            reviewed(WorkProfiles.ECO, HAIKU, 100 + i * 10, List.of());
        }

        assertThat(tally(List.of(), List.of()).recommendations()).singleElement()
                .satisfies(r -> assertThat(r.firedBy()).containsExactly(ProfileTally.SEND_BACKS));
    }

    @Test
    void aSendBackRateJustUnderTheBarIsNotAsked() {
        for (int i = 0; i < 2; i++) {
            sendBack(WorkProfiles.ECO, HAIKU, 10 + i * 10, List.of(ReviewReturnReason.TESTS_MISSING_OR_RED));
        }
        for (int i = 0; i < 8; i++) {
            reviewed(WorkProfiles.ECO, HAIKU, 100 + i * 10, List.of());
        }

        assertThat(tally(List.of(), List.of()).recommendations()).isEmpty();
    }

    /** E2, with a per-project bar: 4 of 10 meets 0.40 and not 0.50; 3 of 10 does not meet 0.40. */
    @Test
    void theBarIsTheProjectsOwnSetting() {
        for (int i = 0; i < 4; i++) {
            sendBack(WorkProfiles.ECO, HAIKU, 10 + i * 10, List.of(ReviewReturnReason.TESTS_MISSING_OR_RED));
        }
        for (int i = 0; i < 6; i++) {
            reviewed(WorkProfiles.ECO, HAIKU, 100 + i * 10, List.of());
        }

        assertThat(viewWith(ProfileRecommendationSettings.of(0.4)).recommendations()).hasSize(1);
        assertThat(viewWith(ProfileRecommendationSettings.of(0.5)).recommendations()).isEmpty();
    }

    @Test
    void aSendBackRateUnderAStricterBarIsNotAsked() {
        for (int i = 0; i < 3; i++) {
            sendBack(WorkProfiles.ECO, HAIKU, 10 + i * 10, List.of(ReviewReturnReason.TESTS_MISSING_OR_RED));
        }
        for (int i = 0; i < 7; i++) {
            reviewed(WorkProfiles.ECO, HAIKU, 100 + i * 10, List.of());
        }

        assertThat(viewWith(ProfileRecommendationSettings.of(0.4)).recommendations()).isEmpty();
    }

    /** E4: integration-failed is excluded only as the sole reason: named with another, the send-back counts. */
    @Test
    void aSendBackThatNamesIntegrationAndAnotherReasonCounts() {
        for (int i = 0; i < ProfileTally.MIN_REVIEWED; i++) {
            sendBack(WorkProfiles.ECO, HAIKU, 10 + i * 10,
                    List.of(ReviewReturnReason.INTEGRATION_FAILED, ReviewReturnReason.TESTS_MISSING_OR_RED));
        }

        assertThat(tally(List.of(), List.of()).cells()).singleElement().satisfies(c -> {
            assertThat(c.sentBack()).isEqualTo(ProfileTally.MIN_REVIEWED);
            assertThat(c.sendBackRate()).isEqualTo(1.0);
        });
    }

    /** E5: one review that broke a rule and sent the card back counts once in each measure, and both are named. */
    @Test
    void aReviewThatBrokeARuleAndSentBackCountsOnceInEachMeasure() {
        for (int i = 0; i < 2; i++) {
            sendBackExit(UUID.randomUUID(), WorkProfiles.ECO, HAIKU, 10 + i * 10, List.of(LAYER),
                    List.of(ReviewReturnReason.TESTS_MISSING_OR_RED), UUID.randomUUID());
        }
        for (int i = 0; i < 3; i++) {
            reviewed(WorkProfiles.ECO, HAIKU, 100 + i * 10, List.of());
        }

        assertThat(tally(List.of(), List.of()).recommendations()).singleElement().satisfies(r -> {
            assertThat(r.firedBy()).containsExactly(ProfileTally.VIOLATIONS, ProfileTally.SEND_BACKS);
            assertThat(r.violating()).isEqualTo(2);
            assertThat(r.sentBack()).isEqualTo(2);
        });
    }

    /** E7: a send-back whose return is not found counts, since nothing says the integration caused it. */
    @Test
    void aSendBackWithNoFoundReturnCounts() {
        for (int i = 0; i < ProfileTally.MIN_REVIEWED; i++) {
            sendBackExit(UUID.randomUUID(), WorkProfiles.ECO, HAIKU, 10 + i * 10, List.of(), List.of(), null);
        }

        assertThat(tally(List.of(), List.of()).recommendations()).singleElement()
                .satisfies(r -> assertThat(r.sentBack()).isEqualTo(ProfileTally.MIN_REVIEWED));
    }

    /** E8: no stronger rung above Opus: an Opus cell over the bar gets no recommendation, its rates still show. */
    @Test
    void aCellOnTheStrongestModelIsNotAskedButItsRatesShow() {
        for (int i = 0; i < ProfileTally.MIN_REVIEWED; i++) {
            sendBack(WorkProfiles.ECO, "claude-opus-5-5", 10 + i * 10,
                    List.of(ReviewReturnReason.TESTS_MISSING_OR_RED));
        }

        ProfileTally.View view = tally(List.of(), List.of());

        assertThat(view.recommendations()).isEmpty();
        assertThat(view.cells()).singleElement().satisfies(c -> assertThat(c.sendBackRate()).isEqualTo(1.0));
    }

    /** E9: a review exit outside the period is not counted. */
    @Test
    void aSendBackOutsideThePeriodIsNotCounted() {
        for (int i = 0; i < ProfileTally.MIN_REVIEWED; i++) {
            sendBack(WorkProfiles.ECO, HAIKU, 40 + i * 5, List.of(ReviewReturnReason.TESTS_MISSING_OR_RED));
        }

        ProfileTally.View view = ProfileTally.of(new ProfileTally.Input(Map.of(), runs, outcomes, returns, List.of(),
                List.of(), T0, at(30), Set.of()), ProfileRecommendationSettings.DEFAULTS);

        assertThat(view.cells()).isEmpty();
        assertThat(view.recommendations()).isEmpty();
    }

    /** E10: one card sent back twice in a cell is two review exits, and counts twice. */
    @Test
    void aCardSentBackTwiceCountsTwice() {
        UUID card = UUID.randomUUID();
        sendBackExit(card, WorkProfiles.ECO, HAIKU, 10, List.of(), List.of(ReviewReturnReason.TESTS_MISSING_OR_RED),
                UUID.randomUUID());
        sendBackExit(card, WorkProfiles.ECO, HAIKU, 30, List.of(), List.of(ReviewReturnReason.TESTS_MISSING_OR_RED),
                UUID.randomUUID());
        for (int i = 0; i < 3; i++) {
            reviewed(WorkProfiles.ECO, HAIKU, 100 + i * 10, List.of());
        }

        assertThat(tally(List.of(), List.of()).cells()).singleElement().satisfies(c -> {
            assertThat(c.reviewed()).isEqualTo(5);
            assertThat(c.sentBack()).isEqualTo(2);
        });
    }
}
