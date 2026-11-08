package com.javadaba.contexts.officium.domain;

import java.util.List;
import java.util.UUID;

/**
 * Pure invariants over a card's executor axis (contract §2): a {@code human} card's {@code
 * runState} is always {@code idle} -- no agent runs it -- and it always has at least one
 * assignee. Static and framework-free on purpose: {@code CardService} calls these on every
 * create/update/setRunState/setExecutor, and they're unit-tested directly (JDB-214).
 */
public final class CardRules {

    private CardRules() {
    }

    public static void requireRunnable(Executor executor, RunState desired) {
        if (executor == Executor.HUMAN && desired != RunState.IDLE) {
            throw OfficiumException.badRequest(
                    "human_card_not_runnable", "A human card's runState stays idle; no agent runs it");
        }
    }

    public static void requireAssignee(Executor executor, List<Assignee> assignees) {
        if (executor == Executor.HUMAN && (assignees == null || assignees.isEmpty())) {
            throw OfficiumException.badRequest(
                    "human_card_needs_assignee", "A human card needs at least one assignee");
        }
    }

    /**
     * An epic groups cards, and what gets planned is its children, never the epic (JAVA-290). Only
     * the move INTO a sprint is refused: an epic may always go back to the backlog ({@code null}).
     */
    public static void requirePlannable(Category category, UUID sprintId) {
        if (category == Category.EPIC && sprintId != null) {
            throw OfficiumException.conflict("epic_not_plannable",
                    "An epic isn't planned into a sprint: plan its children, which carry its badge");
        }
    }

    /**
     * An epic is worked through its children, never directly (JAVA-292): nobody runs it. Every other
     * run state stays open, so a run left on an epic from before this rule can still be ended.
     */
    public static void requireWorkable(Category category, RunState desired) {
        if (category == Category.EPIC && desired == RunState.RUNNING) {
            throw OfficiumException.conflict("epic_not_workable",
                    "An epic isn't worked directly: work its children, which carry its badge");
        }
    }

    /**
     * An epic with no children can only be refined (JAVA-292), or rejected (card://JAVA-1415): until a
     * card belongs to it ({@link EpicChildren}), a move to any other status is refused.
     */
    public static void requireMovable(Category category, int children, Status target) {
        if (category == Category.EPIC && children == 0 && target != Status.REFINE && target != Status.REJECTED) {
            throw OfficiumException.conflict("epic_has_no_children", "An epic with no children can only be refined "
                    + "or rejected: first give it a card whose epic names its key");
        }
    }

    /**
     * A spike delivers an answer, not a release (card://JAVA-1585, owner, 2026-10-18): it never waits in Deploy,
     * and closes as soon as its review approves it. Refused for everyone, a person's drag included.
     */
    public static void requireNotDeployed(Category category, Status target) {
        if (category == Category.SPIKE && target == Status.DEPLOY) {
            throw OfficiumException.conflict("spike_skips_deploy", "A spike never waits in Deploy: once its review "
                    + "approves it, move it to done with the review's qualityScorecard and role");
        }
    }

    /**
     * Only a spike has a subtype (JAVA-391): one sent for a card that will not be a spike is the
     * caller's mistake, not something to drop in silence. A spike given none defaults in {@link Card}.
     */
    public static void requireSubtypeFits(Category category, SpikeSubtype subtype) {
        if (subtype != null && category != Category.SPIKE) {
            throw OfficiumException.badRequest("subtype_not_allowed",
                    "Only a spike has a subtype: drop `subtype`, or make the card's category spike");
        }
    }

    /**
     * A closed card is not worked (card://JAVA-1415): nothing is queued or asked on a Completed card,
     * nor on a rejected one until it is reopened.
     */
    public static void requireOpen(Status status) {
        if (status == Status.DONE) {
            throw OfficiumException.conflict("card_done",
                    "A Completed card is not worked again: move it back to a column first");
        }
        if (status == Status.REJECTED) {
            throw OfficiumException.conflict("card_rejected",
                    "A rejected card is not worked: reopen it in refine first");
        }
    }

    /** A card is blocked while any card blocking it is not {@link Status#finished() finished} (contract §2). */
    public static boolean isBlocked(List<Status> blockerStatuses) {
        return blockerStatuses != null && blockerStatuses.stream().anyMatch(s -> !s.finished());
    }
}
