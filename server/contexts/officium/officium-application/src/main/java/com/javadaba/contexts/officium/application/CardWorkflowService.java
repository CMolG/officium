package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardWorkflow;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.GoverningWorkflow;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.SpikeSubtype;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.CardWorkflowWriter;
import com.javadaba.contexts.officium.domain.ports.RoleCatalog;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Instant;
import java.util.Collection;
import java.util.Objects;
import java.util.UUID;

/**
 * Sets or clears a card's own workflow (card://JAVA-1591). The document is checked against the card as it is now, so
 * a category or signal change later leaves a stale pick, which the matrix then answers for. Setting the same document
 * again changes nothing and answers the card.
 *
 * <p>An epic's workflow is written once for all its cards (owner directive, 2026-10-27, card://JAVA-1885): a card
 * inside a live epic takes none of its own and is answered {@code epic_workflow}, naming the epic to write it on.
 * Clearing the one such a card carried from before is still allowed.
 */
@ApplicationScoped
public class CardWorkflowService {

    private final CardRepository cards;
    private final CardWorkflowWriter writer;
    private final CardService cardService;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final RoleMatrixService roleMatrices;
    private final RoleCatalog catalog;

    @Inject
    public CardWorkflowService(CardRepository cards, CardWorkflowWriter writer, CardService cardService,
            ProjectAccessGuard guard, ActivityPublisher activity, RoleMatrixService roleMatrices, RoleCatalog catalog) {
        this.cards = cards;
        this.writer = writer;
        this.cardService = cardService;
        this.guard = guard;
        this.activity = activity;
        this.roleMatrices = roleMatrices;
        this.catalog = catalog;
    }

    /**
     * {@code workflow} is the document as the caller wrote it, or null to clear it. A person's write is a human edit
     * the card's owner has to acknowledge; an agent's is not ({@link Card#editedBy}).
     */
    public CardView set(UUID accountId, UUID projectId, UUID cardId, int expectedVersion, Object workflow,
            Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Card current = cards.findById(projectId, cardId).filter(card -> !card.deleted())
                .orElseThrow(() -> OfficiumException.notFound("card_not_found", "No such card"));
        if (current.version() != expectedVersion) {
            throw new CardVersionConflictException(cardService.buildView(current));
        }
        if (workflow != null) {
            requireOutsideAnEpic(current.key(), GoverningWorkflow.of(current, cards).epic());
        }
        CardWorkflow next = workflow == null
                ? null
                : CardWorkflow.validate(workflow,
                        roleMatrices.effective(projectId), catalog.rules(), current.category(), current.subtype(),
                        current.signals());
        if (Objects.equals(next, current.workflow())) {
            return cardService.buildView(current);
        }
        Instant now = Instant.now();
        Card updated = current.withWorkflow(next).editedBy(actor, now);
        if (!writer.updateIfVersion(updated, expectedVersion)) {
            throw new CardVersionConflictException(cardService.buildView(requireCurrent(projectId, cardId, current)));
        }
        activity.record(projectId, updated.id(), updated.key(), actor, "card.workflow",
                next == null ? "Workflow cleared" : "Workflow set", now);
        activity.publish("card.updated", projectId, updated.id(), updated.key(), updated.version(), actor, now);
        return cardService.buildView(updated);
    }

    /**
     * Checks a document for a card not yet created: {@code cards.create} checks every card before it writes any. A card
     * created inside a live epic is refused like a written one; an epic created in the same batch is not read yet.
     */
    public void check(UUID projectId, Object workflow, Category category, SpikeSubtype subtype,
            Collection<Signal> signals, String epic) {
        if (category != Category.EPIC && epic != null && !epic.isBlank()) {
            requireOutsideAnEpic("the new card", cards.findByKey(projectId, epic)
                    .filter(found -> !found.deleted() && found.category() == Category.EPIC).map(Card::key)
                    .orElse(null));
        }
        CardWorkflow.validate(workflow, roleMatrices.effective(projectId), catalog.rules(), category, subtype, signals);
    }

    private static void requireOutsideAnEpic(String card, String epic) {
        if (epic != null) {
            throw OfficiumException.conflict("epic_workflow", card + " is a card of epic " + epic + ", whose workflow"
                    + " is written once for all its cards: set it on " + epic + ", with a part for this card's category"
                    + " under `cards` (card://JAVA-1885).");
        }
    }

    private Card requireCurrent(UUID projectId, UUID cardId, Card fallback) {
        return cards.findById(projectId, cardId).orElse(fallback);
    }
}
