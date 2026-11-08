package com.javadaba.contexts.officium.domain;

import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;

/**
 * The rules of the {@link Status#REJECTED} state (card://JAVA-1415), pure so they are unit-tested
 * directly. A move to rejected carries a reason from the closed list and a note saying what was
 * wrong; three reasons also name a card. A completed card is never rejected (shipped work is undone
 * by a new card), and a rejected card leaves only for refine, where its plan is checked again.
 */
public final class RejectionRules {

    public static final int NOTE_MAX = 2_000;

    private RejectionRules() {
    }

    /** What a move sent as its rejection: the reason's wire id, the note, and the key of the card it names. */
    public record Request(String reason, String note, String card) {
    }

    /**
     * Checks {@code card}'s move to {@code to} and answers the rejection it must carry once moved: the
     * new one when the move rejects it, the one it keeps when it is reordered among the rejected, and
     * empty when it ends anywhere but rejected. {@code enabled} gates new rejections only (the rollout
     * flag, card://JAVA-1491); a move out of rejected is never gated.
     *
     * @param liveCard a key or id of this project to its live card, empty when there is none
     */
    public static Optional<CardRejection> require(Card card, Status to, Request request, boolean enabled,
            Function<String, Optional<Card>> liveCard) {
        Status from = card.status();
        if (request != null && to != Status.REJECTED) {
            throw OfficiumException.badRequest("rejection_without_reject",
                    "A rejection goes with a move to rejected: drop `rejection`, or move the card to rejected");
        }
        if (from == Status.REJECTED && to != Status.REJECTED && to != Status.REFINE) {
            throw OfficiumException.conflict("rejected_reopens_to_refine", "A rejected card reopens in refine, "
                    + "where its plan is checked again before any work: move it to refine");
        }
        if (to != Status.REJECTED) {
            return Optional.empty();
        }
        if (from == Status.REJECTED && request == null) {
            return Optional.ofNullable(card.rejection());
        }
        if (from == Status.DONE) {
            throw OfficiumException.conflict("card_done_not_rejectable",
                    "A completed card shipped, so it isn't rejected: undo its work with a new card");
        }
        if (!enabled) {
            throw OfficiumException.conflict("rejection_disabled", "Rejecting cards is not turned on here yet. "
                    + "Leave the card where it is, with a comment naming why it would be rejected");
        }
        if (request == null || request.reason() == null || request.reason().isBlank()) {
            throw OfficiumException.badRequest("rejection_reason_required", "Rejecting a card needs a reason ("
                    + RejectionReason.wires() + ") and a note saying what was wrong");
        }
        RejectionReason reason = RejectionReason.fromWire(request.reason().strip());
        return Optional.of(new CardRejection(reason, requireNote(request.note()),
                namedCard(card, reason, request.card(), liveCard)));
    }

    /** A card is created to be worked, never already discarded: it is rejected afterwards, with its reason. */
    public static void requireNotBornRejected(Status status) {
        if (status == Status.REJECTED) {
            throw OfficiumException.badRequest("card_born_rejected",
                    "A card is not created rejected: create it, then move it to rejected with a reason");
        }
    }

    private static String requireNote(String note) {
        if (note == null || note.isBlank()) {
            throw OfficiumException.badRequest("rejection_note_required",
                    "Say what was wrong in `note`: it is what a later reading of the rejected cards learns from");
        }
        String stripped = note.strip();
        if (stripped.length() > NOTE_MAX) {
            throw OfficiumException.badRequest("rejection_note_too_long", "A rejection's note is at most "
                    + NOTE_MAX + " characters; this one has " + stripped.length());
        }
        return stripped;
    }

    private static UUID namedCard(Card card, RejectionReason reason, String key,
            Function<String, Optional<Card>> liveCard) {
        if (key == null || key.isBlank()) {
            if (reason.namesCard()) {
                throw OfficiumException.badRequest("rejection_card_required", "A rejection as "
                        + reason.wire() + " names the card it points to: give its key in `card`");
            }
            return null;
        }
        Card named = liveCard.apply(key.strip()).orElseThrow(() -> OfficiumException.badRequest(
                "rejection_card_invalid", "`card` names no live card of this project: " + key.strip()));
        if (named.id().equals(card.id())) {
            throw OfficiumException.badRequest("rejection_card_invalid",
                    "A card can't name itself as the reason it was rejected");
        }
        return named.id();
    }
}
