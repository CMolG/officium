package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardLink;
import com.javadaba.contexts.officium.domain.CardLinkLists;
import com.javadaba.contexts.officium.domain.CardWorkflow;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.CategoryContracts;
import com.javadaba.contexts.officium.domain.DeliveryFlow;
import com.javadaba.contexts.officium.domain.EpicCheckpoints;
import com.javadaba.contexts.officium.domain.EpicChildren;
import com.javadaba.contexts.officium.domain.EscapedDefect;
import com.javadaba.contexts.officium.domain.GoverningWorkflow;
import com.javadaba.contexts.officium.domain.ModRules;
import com.javadaba.contexts.officium.domain.PrecedenceRule;
import com.javadaba.contexts.officium.domain.PrecedenceRules;
import com.javadaba.contexts.officium.domain.ReviewOutcome;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.ReviewReturn;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.contexts.officium.domain.RunShuffle;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.ActivityRepository;
import com.javadaba.contexts.officium.domain.ports.CardFormRepository;
import com.javadaba.contexts.officium.domain.ports.CardLinkRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.CardReviewReturnRepository;
import com.javadaba.contexts.officium.domain.ports.CardTimeEntryRepository;
import com.javadaba.contexts.officium.domain.ToolTier;
import com.javadaba.contexts.officium.domain.ports.PrecedenceRepository;
import com.javadaba.contexts.officium.domain.ports.RoleCatalog;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Stream;

/**
 * Builds the wire {@link CardView} of cards: their links, form questions, time box and logged hours.
 * Lists read the role matrix, the form counts, the hours, the links and the blockers once, not once
 * per card (JAVA-1375), so a board's full load runs a constant number of queries.
 */
@ApplicationScoped
public class CardViewAssembler {

    private final CardRepository cards;
    private final CardLinkRepository links;
    private final RoleMatrixService roleMatrices;
    private final ActivityRepository activityLog;
    private final CardFormRepository cardForms;
    private final CardTimeEntryRepository entries;
    private final CardReviewReturnRepository reviewReturns;
    private final QualityLedger quality;
    private final RoleCatalog catalog;
    private final PrecedenceRepository precedence;

    @Inject
    public CardViewAssembler(CardRepository cards, CardLinkRepository links, RoleMatrixService roleMatrices,
            ActivityRepository activityLog, CardFormRepository cardForms, CardTimeEntryRepository entries,
            CardReviewReturnRepository reviewReturns, QualityLedger quality, RoleCatalog catalog,
            PrecedenceRepository precedence) {
        this.precedence = precedence;
        this.quality = quality;
        this.catalog = catalog;
        this.cards = cards;
        this.links = links;
        this.roleMatrices = roleMatrices;
        this.activityLog = activityLog;
        this.cardForms = cardForms;
        this.entries = entries;
        this.reviewReturns = reviewReturns;
    }

    CardView view(Card card) {
        return view(card, roleMatrices.effective(card.projectId()));
    }

    /** The workflow that governs the card (card://JAVA-1885): its epic's part once the epic's is written. */
    GoverningWorkflow governing(Card card) {
        return GoverningWorkflow.of(card, cards);
    }

    /** What is wrong with the workflow that governs the card, against the card now: empty when none does or it fits. */
    List<CardWorkflow.Problem> workflowProblems(Card card, GoverningWorkflow governing) {
        return governing.problems(roleMatrices.effective(card.projectId()), catalog.rules(), card);
    }

    CardView view(Card card, RoleMatrix matrix) {
        Integer formQuestions = card.executor() == Executor.HUMAN
                ? cardForms.questionCounts(List.of(card.id())).get(card.id())
                : null;
        return build(card, matrix, roleMatrices.shuffle(card.projectId(), matrix), catalog.rules(),
                catalog.toolTiers(), formQuestions,
                entries.totalHoursByCards(List.of(card.id())),
                links.findByCard(card.id()), cards.blockerStatusById(card.id()),
                reviewReturns.listByCard(card.id()),
                quality.escapedDefects().listByOrigins(List.of(card.id())).getOrDefault(card.id(), List.of()),
                quality.reviewOutcomes().listByCards(List.of(card.id())).getOrDefault(card.id(), List.of()),
                mark(card, CardPrecedence.rankingOf(precedence, cards, card.projectId())), governing(card),
                progressByEpic(card.projectId(), List.of(card)).get(card.key()));
    }

    List<CardView> views(UUID projectId, List<Card> list) {
        return views(projectId, list, progressByEpic(projectId, list));
    }

    /**
     * The change feed's views (card://JAVA-1873): a card that changed changes its epic's progress, so the epic rides
     * along even when it did not change itself, and a board holding a copy never keeps a stale "N/M" on its face.
     */
    List<CardView> changeViews(UUID projectId, List<Card> changed) {
        if (changed.stream().noneMatch(card -> card.category() == Category.EPIC
                || card.epic() != null && !card.epic().isBlank())) {
            return views(projectId, changed, Map.of());
        }
        List<Card> project = cards.findAllByProject(projectId).stream().filter(card -> !card.deleted()).toList();
        return views(projectId,
                Stream.concat(changed.stream(), EpicChildren.epicsTouchedBy(changed, project).stream()).toList(),
                EpicCheckpoints.progressByEpic(project));
    }

    /** Each listed epic's progress, from one read of the project's cards; a list with no epic reads nothing. */
    private Map<String, EpicCheckpoints.Progress> progressByEpic(UUID projectId, List<Card> list) {
        return list.stream().anyMatch(card -> card.category() == Category.EPIC)
                ? EpicCheckpoints.progressByEpic(cards.findAllByProject(projectId))
                : Map.of();
    }

    private List<CardView> views(UUID projectId, List<Card> list, Map<String, EpicCheckpoints.Progress> progress) {
        if (list.isEmpty()) {
            return List.of();
        }
        RoleMatrix matrix = roleMatrices.effective(projectId);
        ModRules rules = catalog.rules();
        Map<String, ToolTier> toolTiers = catalog.toolTiers();
        Map<UUID, Integer> formQuestions = cardForms.questionCounts(
                list.stream().filter(card -> card.executor() == Executor.HUMAN).map(Card::id).toList());
        List<UUID> ids = list.stream().map(Card::id).toList();
        Map<UUID, Double> hours = entries.totalHoursByCards(ids);
        // A link between two listed cards belongs to both of them.
        Map<UUID, List<CardLink>> linksByCard = new HashMap<>();
        for (CardLink link : links.findByCards(ids)) {
            linksByCard.computeIfAbsent(link.sourceCardId(), id -> new ArrayList<>()).add(link);
            linksByCard.computeIfAbsent(link.targetCardId(), id -> new ArrayList<>()).add(link);
        }
        Map<UUID, Map<UUID, Status>> blockers = cards.blockerStatusByCard(ids);
        Map<UUID, List<ReviewReturn>> returns = reviewReturns.listByCards(ids);
        Map<UUID, List<EscapedDefect>> escaped = quality.escapedDefects().listByOrigins(ids);
        Map<UUID, List<ReviewOutcome>> outcomes = quality.reviewOutcomes().listByCards(ids);
        CardPrecedence.Ranking ranking = CardPrecedence.rankingOf(precedence, cards, projectId);
        RunShuffle shuffle = roleMatrices.shuffle(projectId, matrix);
        Function<Card, GoverningWorkflow> governing = GoverningWorkflow.over(list, cards);
        return list.stream().map(card -> build(card, matrix, shuffle, rules, toolTiers, formQuestions.get(card.id()),
                hours,
                linksByCard.getOrDefault(card.id(), List.of()), blockers.getOrDefault(card.id(), Map.of()),
                returns.getOrDefault(card.id(), List.of()), escaped.getOrDefault(card.id(), List.of()),
                outcomes.getOrDefault(card.id(), List.of()), mark(card, ranking), governing.apply(card),
                progress.get(card.key()))).toList();
    }

    /** The view of a card created by this batch, from the batch's own links; it has no time yet. */
    CardView viewOfNewCard(Card card, List<CardLink> batchLinks, Map<UUID, Status> newStatuses,
            RoleMatrix matrix, CardPrecedence.Ranking ranking) {
        List<CardLink> own = batchLinks.stream()
                .filter(link -> link.sourceCardId().equals(card.id()) || link.targetCardId().equals(card.id()))
                .toList();
        // Only new cards are link sources here, so every blocker's status is in the batch's own map.
        CardLinkLists lists = CardLinkLists.of(card, own, newStatuses);
        // A card created In progress has no move yet: its run started when it was created.
        return CardView.of(card, lists, matrix, roleMatrices.shuffle(card.projectId(), matrix), catalog.rules(),
                CategoryContracts.timeBoxEndsAt(card, List::of).orElse(null), null, 0, null, List.of(), List.of(),
                List.of(), catalog.toolTiers(), mark(card, ranking), governing(card));
    }

    /** One card's send-backs, oldest first (card://JAVA-1443: the rework cap reads them on every move into or out of review). */
    List<ReviewReturn> returnsOf(UUID cardId) {
        return reviewReturns.listByCard(cardId);
    }

    /** Every send-back of the project, by card (card://JAVA-1416): what OQL's `reviewReturns` and `returnReason` read. */
    Map<UUID, List<ReviewReturn>> returnsByCard(UUID projectId) {
        Map<UUID, List<ReviewReturn>> byCard = new HashMap<>();
        reviewReturns.listByProject(projectId)
                .forEach(entry -> byCard.computeIfAbsent(entry.cardId(), id -> new ArrayList<>()).add(entry));
        return byCard;
    }

    /** The card's moves, oldest first, read through the activity log's index on the card. */
    List<DeliveryFlow.Move> movesOf(Card card) {
        return activityLog.listByCard(card.projectId(), card.id(), "card.moved").stream()
                .map(DeliveryFlow::moveOf).flatMap(Optional::stream)
                .filter(move -> move.cardId().equals(card.id()))
                .toList();
    }

    private CardView build(Card card, RoleMatrix matrix, RunShuffle shuffle, ModRules rules,
            Map<String, ToolTier> toolTiers,
            Integer formQuestions, Map<UUID, Double> hours, List<CardLink> cardLinks, Map<UUID, Status> blockers,
            List<ReviewReturn> returns, List<EscapedDefect> escaped, List<ReviewOutcome> outcomes,
            CardView.PrecedenceMark precedence, GoverningWorkflow governing, EpicCheckpoints.Progress progress) {
        CardLinkLists lists = CardLinkLists.of(card, cardLinks, blockers);
        return CardView.of(card, lists, matrix, shuffle, rules,
                CategoryContracts.timeBoxEndsAt(card, () -> movesOf(card)).orElse(null), formQuestions,
                hours.getOrDefault(card.id(), 0.0), namedCardKey(card), returns, escaped, outcomes, toolTiers,
                precedence, governing, progress);
    }

    /** The rule that ranks {@code card} and the card's place under it; null when no rule matches it (ADR 0032). */
    private static CardView.PrecedenceMark mark(Card card, CardPrecedence.Ranking ranking) {
        int position = PrecedenceRules.rankOf(card, ranking.resolved());
        if (position == 0) {
            return null;
        }
        PrecedenceRule rule = ranking.rules().get(position - 1);
        return new CardView.PrecedenceMark(rule.id(), rule.name(), rule.reason(), position, ranking.rules().size());
    }

    /** The key of the card a rejection names (card://JAVA-1415), read only for a rejected card naming one. */
    private String namedCardKey(Card card) {
        if (card.rejection() == null || card.rejection().cardId() == null) {
            return null;
        }
        return cards.findById(card.projectId(), card.rejection().cardId()).filter(named -> !named.deleted())
                .map(Card::key).orElse(null);
    }
}
