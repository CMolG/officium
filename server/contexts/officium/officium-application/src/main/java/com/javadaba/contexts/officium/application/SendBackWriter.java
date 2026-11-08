package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.CardRoles;
import com.javadaba.contexts.officium.domain.GoverningWorkflow;
import com.javadaba.contexts.officium.domain.ActorKind;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardComment;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.ReviewReturn;
import com.javadaba.contexts.officium.domain.ReviewReturnReason;
import com.javadaba.contexts.officium.domain.ReviewReturns;
import com.javadaba.contexts.officium.domain.ReviewRework;
import com.javadaba.contexts.officium.domain.SendBack;
import com.javadaba.contexts.officium.domain.StorageUsage;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.CardRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;

/**
 * The send-back half of {@code CardService#move} (card://JAVA-1416), kept out of it because the service is at its
 * size ceiling: it checks the move's {@code reviewReturn}, builds what the move's transaction writes (the findings
 * comment and the log entry), and records what happened afterwards.
 */
final class SendBackWriter {

    private final CardRepository cards;
    private final ActivityPublisher activity;
    private final RoleMatrixService roleMatrices;
    private final StorageQuotaService quota;
    private final Consumer<Card> reindex;

    SendBackWriter(CardRepository cards, ActivityPublisher activity, RoleMatrixService roleMatrices,
            StorageQuotaService quota, Consumer<Card> reindex) {
        this.cards = cards;
        this.activity = activity;
        this.roleMatrices = roleMatrices;
        this.quota = quota;
        this.reindex = reindex;
    }

    /**
     * What the move writes with its status change; empty when the move is not a send-back. {@code asked} is the status
     * the move asked for, {@code landing} where it lands (refine when the cap ends the loop, card://JAVA-1443), and
     * {@code prior} the card's send-backs before this one.
     */
    Optional<SendBack> prepare(Project project, Card current, Status asked, ReviewRework.Landing landing,
            List<ReviewReturn> prior, ReviewReturns.Request request, Actor actor, Instant now) {
        List<String> eligibleRoles = CardRoles.eligible(roleMatrices.effective(current.projectId()), current.category(),
                current.subtype(), current.status(), current.signals(),
                GoverningWorkflow.of(current, cards).workflow());
        return ReviewReturns.require(current.status(), asked, request, actor.kind(), eligibleRoles)
                .map(checked -> {
                    UUID commentId = UUID.randomUUID();
                    String escalation = landing.escalated()
                            ? "\n\n" + ReviewRework.escalation(prior, checked.reasons())
                            : "";
                    CardComment findings = new CardComment(commentId, current.id(), actor,
                            "Sent back to " + landing.to().wire() + ": " + wires(checked.reasons()) + "\n\n"
                                    + checked.findings() + escalation,
                            now, now);
                    ReviewReturn entry = new ReviewReturn(UUID.randomUUID(), current.projectId(), current.id(), now,
                            actor, checked.role(), current.status(), landing.to(), checked.reasons(), commentId);
                    quota.requireRoom(project, StorageUsage.bytesOf(findings.text()));
                    return new SendBack(entry, findings);
                });
    }

    /**
     * After the move committed: its history line, its comment event, and the human edit of a person's send-back.
     * Answers {@code moved} as it is now; a move that was not a send-back ({@code sendBack} null) changes nothing.
     */
    Card record(Card moved, SendBack sendBack, Actor actor) {
        if (sendBack == null) {
            return moved;
        }
        ReviewReturn entry = sendBack.entry();
        activity.record(moved.projectId(), moved.id(), moved.key(), actor, "card.sentBack",
                "Sent back to " + entry.to().wire() + ": " + wires(entry.reasons()), entry.at());
        activity.publish("card.comment", moved.projectId(), moved.id(), moved.key(), null, actor, entry.at());
        if (actor.kind() != ActorKind.PERSON) {
            return moved;
        }
        // A person's send-back adds to what the card says, as a person's comment does: the agent must see it.
        Card edited = moved.editedBy(actor, entry.at());
        cards.updateIfVersion(edited, moved.version());
        reindex.accept(edited);
        return cards.findById(moved.projectId(), moved.id()).orElse(edited);
    }

    private static String wires(List<ReviewReturnReason> reasons) {
        return String.join(", ", reasons.stream().map(ReviewReturnReason::wire).toList());
    }
}
