package com.javadaba.contexts.officium.domain;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * An epic's status follows its children's (card://JAVA-379), as its category contract says: an epic
 * is never worked itself, so the only honest place for it on the board is where its children are.
 * The children are {@link EpicChildren}'s; a child is open until it is {@link Status#closed() closed}
 * (done or rejected). A rejected child is discarded work, so it never pulls its epic anywhere
 * (card://JAVA-1415), and a rejection never cascades from an epic to its children.
 */
public final class EpicStatus {

    private EpicStatus() {
    }

    /**
     * Where an epic with these children sits. No children, or only rejected ones: {@code refine}
     * (JAVA-292), to be planned again or rejected. Every other child done: {@code review}, not done,
     * because the contract's exit also asks for the goal verified end to end, which is the Review job.
     * Otherwise the lowest status among the open children, raised to {@code doing} once any child has
     * started ({@code doing} or later, done included).
     */
    public static Status derive(List<Status> children) {
        List<Status> kept = children.stream().filter(s -> s != Status.REJECTED).toList();
        if (kept.isEmpty()) {
            return Status.REFINE;
        }
        if (kept.stream().allMatch(s -> s == Status.DONE)) {
            return Status.REVIEW;
        }
        Status lowestOpen = kept.stream().filter(s -> s != Status.DONE)
                .min(Comparator.naturalOrder()).orElseThrow();
        boolean started = kept.stream().anyMatch(s -> s.compareTo(Status.DOING) >= 0);
        return started && lowestOpen.compareTo(Status.DOING) < 0 ? Status.DOING : lowestOpen;
    }

    /**
     * The status an epic now in {@code current} has to take, or empty when it stays. An epic a person
     * closed (deploy, done or rejected) is left alone while none of its children is open: losing its
     * last child, or having the rest rejected, does not reopen what shipped or was discarded. A child
     * reopened later re-derives it.
     */
    public static Optional<Status> follow(Status current, List<Status> children) {
        if ((current.finished() || current.closed()) && children.stream().allMatch(Status::closed)) {
            return Optional.empty();
        }
        Status derived = derive(children);
        return derived == current ? Optional.empty() : Optional.of(derived);
    }

    /**
     * A person's move of {@code epic}, its children taken from {@code project}: the childless rule first
     * ({@link CardRules#requireMovable}), then {@link #requireManualMove(Status, List, Status)}.
     */
    public static void requireManualMove(Card epic, List<Card> project, Status target) {
        List<Status> children = EpicChildren.byEpic(project).getOrDefault(epic.key(), List.of()).stream()
                .map(Card::status).toList();
        CardRules.requireMovable(epic.category(), children.size(), target);
        requireManualMove(epic.status(), children, target);
    }

    /**
     * A person's move of an epic now in {@code current}: refused while it has open children, unless
     * the move is among review, deploy and done once none is open, or a rejection once none is open.
     * A childless epic keeps JAVA-292's rule ({@link CardRules#requireMovable}), and a rejected one
     * reopens in refine ({@link RejectionRules}), where it follows its children again.
     */
    public static void requireManualMove(Status current, List<Status> children, Status target) {
        if (children.isEmpty() || current == Status.REJECTED) {
            return;
        }
        long open = children.stream().filter(s -> !s.closed()).count();
        if (open > 0 && target == Status.REJECTED) {
            throw OfficiumException.conflict("epic_children_open", "An epic is rejected once none of its children "
                    + "is open: finish or reject its " + open + " open " + (open == 1 ? "child" : "children")
                    + " first");
        }
        if (target == Status.DONE && open > 0) {
            throw OfficiumException.conflict("epic_children_open", "An epic closes when its children do: "
                    + open + " of its " + children.size() + (children.size() == 1 ? " child" : " children")
                    + (open == 1 ? " is" : " are") + " still open");
        }
        if (target == Status.REJECTED) {
            return;
        }
        if (open > 0 || !(target == Status.REVIEW || target == Status.DEPLOY || target == Status.DONE)) {
            throw OfficiumException.conflict("epic_status_derived", "An epic's status follows its children: "
                    + "move them, and it follows. Once every child is done it can go between review, deploy and done");
        }
    }
}
