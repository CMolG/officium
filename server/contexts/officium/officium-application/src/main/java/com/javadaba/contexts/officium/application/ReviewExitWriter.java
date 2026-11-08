package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.CardRoles;
import com.javadaba.contexts.officium.domain.GoverningWorkflow;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.ReviewOutcome;
import com.javadaba.contexts.officium.domain.ReviewQuality;
import com.javadaba.contexts.officium.domain.ReviewReturn;
import com.javadaba.contexts.officium.domain.ReviewReturns;
import com.javadaba.contexts.officium.domain.ReviewRework;
import com.javadaba.contexts.officium.domain.SendBack;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.PhaseRunRepository;
import com.javadaba.contexts.officium.domain.ports.ReviewOutcomeRepository;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * What a move writes besides the card itself in {@code CardService#move}, kept out of it because the service is at its
 * size ceiling: on an exit from review, the ADR 0031 send-back ({@link SendBackWriter}) and the engineering-quality
 * outcome (card://JAVA-1526), checked before the move and logged once it committed; on any status change, who ran
 * the phase the card left ({@link PhaseRunRecorder}, card://JAVA-1527).
 */
final class ReviewExitWriter {

    private static final Logger LOG = Logger.getLogger(ReviewExitWriter.class.getName());

    /**
     * What a move carries out of review: where it lands (refine when the review rework cap ends the loop,
     * card://JAVA-1443), its send-back (null when none) and its quality outcome (null when none).
     */
    record Prepared(ReviewRework.Landing landing, SendBack sendBack, ReviewQuality.Checked quality, String role) {
    }

    private final SendBackWriter sendBacks;
    private final ReviewOutcomeRepository outcomes;
    private final PhaseRunRecorder phaseRuns;
    private final RoleMatrixService roleMatrices;
    /** The card's send-backs, oldest first: {@code returnsOf.apply(cardId)}. */
    private final Function<UUID, List<ReviewReturn>> returnsOf;
    private final CardRepository cards;

    ReviewExitWriter(SendBackWriter sendBacks, ReviewOutcomeRepository outcomes, PhaseRunRepository phaseRuns,
            RoleMatrixService roleMatrices, Function<UUID, List<ReviewReturn>> returnsOf, CardRepository cards) {
        this.sendBacks = sendBacks;
        this.outcomes = outcomes;
        this.phaseRuns = new PhaseRunRecorder(phaseRuns, roleMatrices, cards);
        this.roleMatrices = roleMatrices;
        this.returnsOf = returnsOf;
        this.cards = cards;
    }

    Prepared prepare(Project project, Card current, Status asked, ReviewReturns.Request reviewReturn,
            Map<String, String> qualityScorecard, String role, Actor actor, Instant now) {
        boolean reviewed = current.status() == Status.REVIEW || asked == Status.REVIEW;
        List<ReviewReturn> prior = reviewed ? returnsOf.apply(current.id()) : List.of();
        if (current.status() != asked) {
            ReviewRework.requireRoomToReview(asked, prior);
        }
        ReviewRework.Landing landing = ReviewRework.route(current.status(), asked, prior);
        SendBack sendBack = sendBacks.prepare(project, current, asked, landing, prior, reviewReturn, actor, now)
                .orElse(null);
        List<String> eligibleRoles = CardRoles.eligible(roleMatrices.effective(current.projectId()), current.category(),
                current.subtype(), current.status(), current.signals(),
                GoverningWorkflow.of(current, cards).workflow());
        ReviewQuality.Request quality = new ReviewQuality.Request(
                reviewReturn == null ? null : reviewReturn.ruleViolations(), qualityScorecard);
        return new Prepared(landing, sendBack, ReviewQuality.require(current, asked, quality, actor.kind(),
                eligibleRoles, sendBack == null ? null : sendBack.entry().role()).orElse(null), role);
    }

    /**
     * After the move committed: the send-back's history and comment, the outcome's log entry, then the phase run.
     * The last two are history the card's move does not depend on: a failed write is logged, never answered as a
     * failed move that already happened (a retry would only meet a version conflict).
     */
    Card record(Card before, Card moved, Prepared prepared, Actor actor, Instant now) {
        Status from = before.status();
        Card after = sendBacks.record(moved, prepared.sendBack(), actor);
        ReviewQuality.Checked quality = prepared.quality();
        if (quality != null) {
            bestEffort("review outcome", moved,
                    () -> outcomes
                            .insert(new ReviewOutcome(UUID.randomUUID(), moved.projectId(), moved.id(), now, actor,
                                    quality.role(), from, moved.status(), quality.verdict(), quality.ruleViolations(),
                                    quality.scorecard(), quality.observations(),
                                    prepared.sendBack() == null ? null : prepared.sendBack().entry().id())));
        }
        bestEffort("phase run", moved, () -> phaseRuns.record(before, moved, prepared.role(), actor, now));
        return after;
    }

    private static void bestEffort(String what, Card card, Runnable write) {
        try {
            write.run();
        } catch (RuntimeException ex) {
            LOG.log(Level.WARNING, "The " + what + " of " + card.key() + "'s move was not kept", ex);
        }
    }
}
