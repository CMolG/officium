package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Status;

import java.util.List;
import java.util.UUID;

/**
 * A review creates no cards (card://JAVA-1586, owner, 2026-10-18): whatever it finds goes back to development as a
 * send-back with the corrections to make. The rule binds the worker, not the computer it runs on: a write names the
 * card its session is working on ({@code workingOn}), and it is refused only when that card is in Review and this
 * account has a live session on it. A machine name told sessions apart until 2026-10-20, and any other session that
 * shared it -- a person's, or a slot's next one -- was refused for a review it was not doing.
 */
public final class ReviewCreationGuard {

    private ReviewCreationGuard() {
    }

    public static void requireNotReviewing(AgentWorkService work, UUID accountId, UUID projectId, String workingOn) {
        if (work.reviewing(accountId, projectId, workingOn)) {
            throw OfficiumException.conflict("review_creates_no_cards", "A review creates no cards: send "
                    + workingOn.strip() + " back with cards.move and a reviewReturn whose findings list the "
                    + "corrections to make");
        }
    }

    /** Whether the card {@code cardId}, in {@code status}, is in Review with a live session of {@code accountId}. */
    static boolean reviewing(List<AgentWorkView> active, UUID cardId, String status, UUID accountId) {
        return Status.REVIEW.wire().equals(status) && active.stream()
                .anyMatch(view -> cardId.equals(view.cardId()) && accountId.equals(view.actor().accountId()));
    }
}
