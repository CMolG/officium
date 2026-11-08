package com.javadaba.contexts.officium.domain;

import java.util.Set;

/**
 * A card is worked In progress, never in To do (user request, 2026-10-06, JAVA-1042). To do is a support
 * column: a card planned long ago, or changed a lot since, is checked there against what the code and the
 * card say now, and the moment the agent confirms its plan still holds, it moves the card to {@code doing}
 * and works it there. Agents had been doing the work in To do and moving the card straight to Review, so
 * the board showed nothing In progress while code was being written.
 *
 * <p>Two refusals keep the column honest: an agent's {@code ai} card cannot leave To do for a status past
 * the work, and cannot start a run while in To do. Leaving To do for {@code doing} or back to
 * {@code refine} is what the check ends in, so both stay open. Like {@link CategoryContracts}, a person
 * and a {@code human} card are not gated, and an epic's status follows its children.
 */
public final class InProgressContract {

    private static final Set<Status> PAST_WORK = Set.of(Status.READY, Status.REVIEW, Status.DEPLOY, Status.DONE);

    private InProgressContract() {
    }

    public static void requireWorkedInProgress(ActorKind actor, Executor executor, Category category, Status from,
            Status to) {
        if (from != Status.TODO || !PAST_WORK.contains(to) || !gated(actor, executor, category)) {
            return;
        }
        throw OfficiumException.conflict(CategoryContracts.CONTRACT_UNMET, "To do contract: a card is worked In"
                + " progress, never in To do. Move it to doing (cards.move) once its plan is confirmed, work it"
                + " there, and only then move it to " + to.wire() + ".");
    }

    public static void requireRunInProgress(ActorKind actor, Executor executor, Category category, Status status,
            RunState runState) {
        if (status != Status.TODO || runState != RunState.RUNNING || !gated(actor, executor, category)) {
            return;
        }
        throw OfficiumException.conflict(CategoryContracts.CONTRACT_UNMET, "To do contract: a card is worked In"
                + " progress, never in To do. Move it to doing (cards.move) once its plan is confirmed: that move"
                + " starts the run. If the plan no longer holds, move it back to refine with what changed.");
    }

    private static boolean gated(ActorKind actor, Executor executor, Category category) {
        return actor == ActorKind.AGENT && executor != Executor.HUMAN && category != Category.EPIC;
    }
}
