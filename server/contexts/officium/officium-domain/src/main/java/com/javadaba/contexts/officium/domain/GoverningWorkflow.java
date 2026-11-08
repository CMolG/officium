package com.javadaba.contexts.officium.domain;

import com.javadaba.contexts.officium.domain.ports.CardRepository;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.BiFunction;
import java.util.function.Function;

/**
 * The workflow that governs a card (owner directive, 2026-10-27, card://JAVA-1885). An epic's workflow is written
 * once and covers both execution modes: its phases work the epic's session when the project executes by epic, and its
 * cards part works each of its cards, by row, when it executes card by card (and gives a sweep's checkpoints their
 * mods). So a card inside an epic whose workflow is written is governed by that part, never by one of its own. Every
 * other card is governed by its own: an epic, a card with no epic (or whose epic is a label, not a live epic card), and
 * a card whose epic has no workflow yet, which keeps the one it was given before JAVA-1885 until the epic's is written.
 *
 * @param workflow  what governs the card; null when nothing does, and the matrix answers every phase
 * @param epic      the key of the card's live epic; null when it is in none
 * @param inherited whether the epic's workflow is the one that governs the card
 * @param missing   why nothing governs the card, in the words Refine's exit refuses it with
 */
public record GoverningWorkflow(CardWorkflow workflow, String epic, boolean inherited, String missing) {

    static final String NO_WORKFLOW = "the card has no workflow (write it first, cards.setWorkflow)";

    /** {@code epics} reads a card by key; only a card in an epic asks it. */
    public static GoverningWorkflow of(Card card, Function<String, Optional<Card>> epics) {
        if (card.category() == Category.EPIC || card.epic() == null || card.epic().isBlank()) {
            return own(card);
        }
        Optional<Card> epic = epics.apply(card.epic())
                .filter(found -> !found.deleted() && found.category() == Category.EPIC);
        if (epic.isEmpty()) {
            return own(card);
        }
        String key = epic.get().key();
        Optional<String> row = Optional.ofNullable(card.category())
                .map(category -> RoleMatrix.rowFor(category, card.subtype()));
        CardWorkflow written = epic.get().workflow();
        if (written == null) {
            return new GoverningWorkflow(card.workflow(), key, false, "its epic " + key + " has no workflow yet (write"
                    + " it there, once for all its cards: cards.setWorkflow on " + key
                    + row.map(r -> ", with a part for " + r + " cards").orElse("") + ")");
        }
        return new GoverningWorkflow(row.flatMap(written::part).orElse(null), key, true, row
                .map(r -> "its epic " + key + "'s workflow has no part for " + r + " cards (add one there:"
                        + " cards.setWorkflow on " + key + ")")
                .orElse("the card has no category, and its epic " + key + "'s workflow covers its cards by category"
                        + " (set the category first)"));
    }

    /** One card's, reading its epic from the repository. */
    public static GoverningWorkflow of(Card card, CardRepository cards) {
        return of(card, key -> cards.findByKey(card.projectId(), key));
    }

    /** What the card's own workflow governs, as before card://JAVA-1885. */
    public static GoverningWorkflow own(Card card) {
        return new GoverningWorkflow(card.workflow(), null, false, NO_WORKFLOW);
    }

    /** For a list of cards: an epic in the list is read from it, any other once from the repository. */
    public static Function<Card, GoverningWorkflow> over(Collection<Card> known, CardRepository cards) {
        return over(known, cards::findByKey);
    }

    /** For every card of one project: {@code project} holds all of them, so nothing more is read. */
    public static Function<Card, GoverningWorkflow> over(Collection<Card> project) {
        return over(project, (projectId, key) -> Optional.empty());
    }

    private static Function<Card, GoverningWorkflow> over(Collection<Card> known,
            BiFunction<UUID, String, Optional<Card>> read) {
        Map<String, Optional<Card>> epics = new HashMap<>();
        known.stream().filter(card -> card.category() == Category.EPIC && !card.deleted())
                .forEach(epic -> epics.put(epic.key(), Optional.of(epic)));
        return card -> of(card, key -> epics.computeIfAbsent(key, unread -> read.apply(card.projectId(), unread)));
    }

    /**
     * What is wrong with the governing workflow against the card now: its epic's workflow with no part for the card's
     * row, or each pick that no longer fits the card. Empty when it fits, or when nothing governs the card.
     */
    public List<CardWorkflow.Problem> problems(RoleMatrix matrix, ModRules rules, Card card) {
        if (workflow == null) {
            return inherited ? List.of(new CardWorkflow.Problem("document", missing)) : List.of();
        }
        return workflow.problemsFor(matrix, rules, card.category(), card.subtype(), card.signals());
    }

    /** The key of the epic whose workflow governs the card, as its view names it; null when its own does. */
    public String from() {
        return inherited ? epic : null;
    }
}
