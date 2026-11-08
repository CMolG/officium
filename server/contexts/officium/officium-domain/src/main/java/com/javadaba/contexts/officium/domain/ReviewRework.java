package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The review rework cap (card://JAVA-1443): how many send-backs from review a card may take before it escalates to
 * refine, so its plan is redone or it is split instead of looping between review and a work phase. Pure, so it is
 * unit-tested directly. The count is derived from the append-only send-back log ({@link ReviewReturn}): no column,
 * no backfill.
 */
public final class ReviewRework {

    /** Send-backs from review in a row before the card escalates; a generic default, not a per-project knob. */
    public static final int CAP = 3;

    private static final Set<Status> WORK = Set.of(Status.TODO, Status.DOING, Status.READY);

    private ReviewRework() {
    }

    /** Where a move lands: {@code to}, or refine when the cap ends the loop ({@code escalated}). */
    public record Landing(Status to, boolean escalated) {
    }

    /** The send-backs from review since the plan was last redone: a send-back to refine, or one from deploy, starts over. */
    public static int streak(List<ReviewReturn> returns) {
        return rounds(returns).size();
    }

    /**
     * Where a move from {@code from} to {@code to} lands. A send-back from review to a work phase that would reach the
     * cap lands in refine: the findings stay valid, the plan is what is redone.
     *
     * @param prior the card's send-backs, oldest first
     */
    public static Landing route(Status from, Status to, List<ReviewReturn> prior) {
        boolean loop = from == Status.REVIEW && WORK.contains(to);
        return loop && streak(prior) + 1 >= CAP ? new Landing(Status.REFINE, true) : new Landing(to, false);
    }

    /** Whether a card in {@code status} is review work past the cap: {@code cards.next} never hands it out. */
    public static boolean stuck(Status status, List<ReviewReturn> prior) {
        return status == Status.REVIEW && streak(prior) >= CAP;
    }

    /**
     * Refuses an arrival in review for a card that already took the cap (cards that predate the rule). A card that
     * escalated starts over at zero, so a re-planned card gets its budget back.
     */
    public static void requireRoomToReview(Status to, List<ReviewReturn> prior) {
        if (to == Status.REVIEW && streak(prior) >= CAP) {
            throw OfficiumException.conflict("review_rework_cap",
                    "This card went back from review " + CAP + " times: redo its plan or split it in refine first");
        }
    }

    /**
     * The findings' escalation block, posted with the third send-back: how many rounds, and the reasons that recurred.
     *
     * @param prior   the card's send-backs before this one, oldest first
     * @param reasons this send-back's reasons
     */
    public static String escalation(List<ReviewReturn> prior, List<ReviewReturnReason> reasons) {
        List<ReviewReturn> rounds = rounds(prior);
        String recurring = reasons.stream()
                .filter(reason -> rounds.stream().anyMatch(round -> round.reasons().contains(reason)))
                .map(ReviewReturnReason::wire)
                .distinct()
                .collect(Collectors.joining(", "));
        String named = recurring.isEmpty()
                ? "No reason recurred across the rounds: the findings differ each time, so the plan is what is unclear."
                : "Recurring reasons: " + recurring + ".";
        return "## Escalated to refine\n\nThe card went back from review " + (rounds.size() + 1) + " times in a row"
                + " without passing (review rework cap " + CAP + ", card://JAVA-1443). " + named
                + " Redo the plan or split the card before it goes back to work.";
    }

    /** The send-backs from review counted since the last redo, oldest first. */
    private static List<ReviewReturn> rounds(List<ReviewReturn> returns) {
        List<ReviewReturn> rounds = new ArrayList<>();
        for (ReviewReturn entry : returns) {
            if (entry.to() == Status.REFINE || entry.from() == Status.DEPLOY) {
                rounds.clear();
            } else if (entry.from() == Status.REVIEW) {
                rounds.add(entry);
            }
        }
        return rounds;
    }
}
