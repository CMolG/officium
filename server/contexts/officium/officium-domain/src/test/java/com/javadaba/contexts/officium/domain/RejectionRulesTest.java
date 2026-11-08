package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1415: what a move to or from rejected must carry, and every refusal in words. */
class RejectionRulesTest {

    private static final UUID PROJECT = UUID.randomUUID();
    private static final Card ORIGINAL = card("JAVA-99", Status.TODO, null);
    private static final Function<String, Optional<Card>> LIVE = key -> Optional.ofNullable(
            Map.of("JAVA-99", ORIGINAL).get(key));

    private static RejectionRules.Request request(String reason, String note, String card) {
        return new RejectionRules.Request(reason, note, card);
    }

    private static Optional<CardRejection> reject(Card card, RejectionRules.Request request) {
        return RejectionRules.require(card, Status.REJECTED, request, true, LIVE);
    }

    private static void refused(Runnable move, String code) {
        assertThatThrownBy(move::run).isInstanceOfSatisfying(OfficiumException.class,
                e -> assertThat(e.code()).isEqualTo(code));
    }

    @Test
    void aRejectionWithItsReasonAndNoteIsStoredAsGiven() {
        Optional<CardRejection> rejection = reject(card("JAVA-1", Status.DOING, null),
                request("not-needed", "  The owner dropped the feature.  ", null));

        assertThat(rejection).contains(new CardRejection(RejectionReason.NOT_NEEDED, "The owner dropped the feature.",
                null));
    }

    @ParameterizedTest
    @EnumSource(RejectionReason.class)
    void everyReasonIsAcceptedWithACardNamed(RejectionReason reason) {
        Optional<CardRejection> rejection = reject(card("JAVA-1", Status.REFINE, null),
                request(reason.wire(), "What was wrong", "JAVA-99"));

        assertThat(rejection).map(CardRejection::reason).contains(reason);
        assertThat(rejection).map(CardRejection::cardId).contains(ORIGINAL.id());
    }

    @Test
    void aRejectionWithNoReasonIsRefusedListingTheReasons() {
        Card card = card("JAVA-1", Status.TODO, null);

        refused(() -> reject(card, null), "rejection_reason_required");
        refused(() -> reject(card, request(" ", "note", null)), "rejection_reason_required");
        assertThatThrownBy(() -> reject(card, null)).hasMessageContaining("not-needed, duplicate, superseded");
    }

    @Test
    void anUnknownReasonIsRefusedListingTheValidOnes() {
        assertThatThrownBy(() -> reject(card("JAVA-1", Status.TODO, null), request("boring", "note", null)))
                .isInstanceOfSatisfying(OfficiumException.class,
                        e -> assertThat(e.code()).isEqualTo("rejection_reason_invalid"))
                .hasMessageContaining("wrong-split, infeasible, other");
    }

    @Test
    void aRejectionNeedsANoteOfAtMostTwoThousandCharacters() {
        Card card = card("JAVA-1", Status.TODO, null);

        refused(() -> reject(card, request("other", null, null)), "rejection_note_required");
        refused(() -> reject(card, request("other", " \n ", null)), "rejection_note_required");
        refused(() -> reject(card, request("other", "x".repeat(RejectionRules.NOTE_MAX + 1), null)),
                "rejection_note_too_long");
        assertThat(reject(card, request("other", "x".repeat(RejectionRules.NOTE_MAX), null))).isPresent();
    }

    @ParameterizedTest
    @EnumSource(value = RejectionReason.class, names = {"DUPLICATE", "SUPERSEDED", "WRONG_SPLIT"})
    void aReasonThatPointsToACardNeedsItNamed(RejectionReason reason) {
        refused(() -> reject(card("JAVA-1", Status.TODO, null), request(reason.wire(), "note", null)),
                "rejection_card_required");
    }

    @Test
    void theNamedCardIsALiveCardOfTheProjectOtherThanItself() {
        refused(() -> reject(card("JAVA-1", Status.TODO, null), request("duplicate", "note", "JAVA-404")),
                "rejection_card_invalid");
        refused(() -> RejectionRules.require(ORIGINAL, Status.REJECTED, request("duplicate", "note", "JAVA-99"), true,
                LIVE), "rejection_card_invalid");
    }

    @Test
    void aCompletedCardIsNeverRejected() {
        refused(() -> reject(card("JAVA-1", Status.DONE, null), request("other", "note", null)),
                "card_done_not_rejectable");
    }

    @ParameterizedTest
    @EnumSource(value = Status.class, names = {"REFINE", "TODO", "DOING", "READY", "REVIEW", "DEPLOY"})
    void anyOtherStateCanBeRejected(Status from) {
        assertThat(reject(card("JAVA-1", from, null), request("other", "note", null))).isPresent();
    }

    @Test
    void aRejectionSentWithAnotherMoveIsRefused() {
        refused(() -> RejectionRules.require(card("JAVA-1", Status.TODO, null), Status.DOING,
                request("other", "note", null), true, LIVE), "rejection_without_reject");
    }

    @Test
    void aRejectedCardReopensOnlyInRefineAndLeavesItsRejectionBehind() {
        Card rejected = card("JAVA-1", Status.REJECTED, new CardRejection(RejectionReason.OTHER, "note", null));

        refused(() -> RejectionRules.require(rejected, Status.TODO, null, true, LIVE), "rejected_reopens_to_refine");
        assertThat(RejectionRules.require(rejected, Status.REFINE, null, true, LIVE)).isEmpty();
    }

    @Test
    void reorderingAmongTheRejectedKeepsTheRejection() {
        CardRejection kept = new CardRejection(RejectionReason.INFEASIBLE, "The API has no such call", null);

        assertThat(RejectionRules.require(card("JAVA-1", Status.REJECTED, kept), Status.REJECTED, null, false, LIVE))
                .contains(kept);
    }

    @Test
    void withTheFlagOffNothingNewIsRejectedButARejectedCardStillReopens() {
        Card rejected = card("JAVA-1", Status.REJECTED, new CardRejection(RejectionReason.OTHER, "note", null));

        refused(() -> RejectionRules.require(card("JAVA-2", Status.TODO, null), Status.REJECTED,
                request("other", "note", null), false, LIVE), "rejection_disabled");
        assertThat(RejectionRules.require(rejected, Status.REFINE, null, false, LIVE)).isEmpty();
    }

    @Test
    void aMoveThatNeitherRejectsNorReopensIsUntouched() {
        assertThat(RejectionRules.require(card("JAVA-1", Status.TODO, null), Status.DOING, null, false, LIVE))
                .isEmpty();
    }

    private static Card card(String key, Status status, CardRejection rejection) {
        Instant at = Instant.parse("2026-10-13T10:00:00Z");
        Actor agent = Actor.agent(UUID.randomUUID(), "Agent");
        return new Card(UUID.randomUUID(), PROJECT, key, 1, "Title", null, null, status, RunState.IDLE,
                Priority.MEDIUM, Executor.AI, Category.FEATURE, 0, 0, null, List.of(), List.of(), 1, at, at,
                agent, agent, null, null, null, null, 0, List.of(), null, rejection);
    }
}
