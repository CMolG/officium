package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardComment;
import com.javadaba.contexts.officium.domain.CardWorkflow;
import com.javadaba.contexts.officium.domain.CardRules;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.CategoryContracts;
import com.javadaba.contexts.officium.domain.DefinitionOfDone;
import com.javadaba.contexts.officium.domain.GoverningWorkflow;
import com.javadaba.contexts.officium.domain.InProgressContract;
import com.javadaba.contexts.officium.domain.PlanContract;
import com.javadaba.contexts.officium.domain.ReviewChecklist;
import com.javadaba.contexts.officium.domain.RunState;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.LinkType;
import com.javadaba.contexts.officium.domain.ports.CardCommentRepository;
import com.javadaba.contexts.officium.domain.ports.CardLinkRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;

import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Every contract a card's move to another status must meet, in the order they are checked: its category's
 * entry, exit, shipped blockers and follow-up ({@link CategoryContracts}), then a plan before it leaves Refine
 * ({@link PlanContract}, JAVA-915), then In progress before it leaves To do for later work
 * ({@link InProgressContract}, JAVA-1042). The lookups are suppliers so a check that does not apply costs no query.
 */
record TransitionContracts(Supplier<List<CardComment>> commentsThisRun,
        Supplier<List<CategoryContracts.Blocker>> blockers, Supplier<List<Category>> linked,
        Supplier<List<CardComment>> commentsSinceReview, Supplier<GoverningWorkflow> workflow,
        Function<GoverningWorkflow, List<CardWorkflow.Problem>> workflowProblems) {

    /**
     * The contracts of {@code card}'s move, each lookup reading only when its check applies: this run's comments
     * (since the card last entered In progress), its live blockers, and the categories of the live cards linked to
     * it (deleted cards neither block nor count). Moved out of {@code CardService} at its size ceiling (JAVA-1526).
     */
    static TransitionContracts of(Card card, CardRepository cards, CardLinkRepository links,
            CardCommentRepository comments, CardViewAssembler assembler) {
        return new TransitionContracts(
                () -> CategoryContracts.commentsSince(
                        CategoryContracts.runStart(card.createdAt(), assembler.movesOf(card)),
                        comments.listByCard(card.id())),
                () -> links.findByCard(card.id()).stream()
                        .filter(link -> link.type() == LinkType.BLOCKS && link.targetCardId().equals(card.id()))
                        .map(link -> cards.findById(card.projectId(), link.sourceCardId()).filter(c -> !c.deleted()))
                        .flatMap(Optional::stream)
                        .map(blocker -> new CategoryContracts.Blocker(blocker.key(), blocker.status()))
                        .toList(),
                () -> links.findByCard(card.id()).stream()
                        .map(link -> link.sourceCardId().equals(card.id()) ? link.targetCardId() : link.sourceCardId())
                        .map(id -> cards.findById(card.projectId(), id).filter(c -> !c.deleted()))
                        .flatMap(Optional::stream)
                        .map(Card::category)
                        .toList(),
                () -> CategoryContracts.commentsSince(
                        ReviewChecklist.reviewStart(card.createdAt(), assembler.movesOf(card)),
                        comments.listByCard(card.id())),
                () -> assembler.governing(card), governing -> assembler.workflowProblems(card, governing));
    }

    void require(Card current, Status to, Actor actor, List<String> definitionOfDone) {
        Status from = current.status();
        CardRules.requireNotDeployed(current.category(), to);
        CategoryContracts.requireEntry(actor.kind(), current.executor(), current.category(), from, to,
                current.description());
        CategoryContracts.requireExit(actor.kind(), current.executor(), current.category(), from, to,
                commentsThisRun);
        DefinitionOfDone.require(actor.kind(), current, to, definitionOfDone, commentsThisRun);
        CategoryContracts.requireBlockersShipped(actor.kind(), current.executor(), current.category(), from, to,
                blockers);
        CategoryContracts.requireFollowUp(actor.kind(), current.executor(), current.category(), from, to, linked);
        // Its epic is read only for a move out of Refine, the one move whose contract asks for the workflow.
        GoverningWorkflow governing = from == Status.REFINE ? workflow.get() : GoverningWorkflow.own(current);
        PlanContract.requireExit(current.executor(), current.category(), from, to, governing,
                governing.workflow() == null ? List.of() : workflowProblems.apply(governing), current.actionPlan());
        InProgressContract.requireWorkedInProgress(actor.kind(), current.executor(), current.category(), from, to);
        ReviewChecklist.require(actor.kind(), current, to, commentsSinceReview);
    }

    /** What a run state must meet: a runnable executor, a workable category, and not To do (JAVA-1042). */
    static void requireRun(Card current, RunState runState, Actor actor) {
        CardRules.requireRunnable(current.executor(), runState);
        CardRules.requireWorkable(current.category(), runState);
        InProgressContract.requireRunInProgress(actor.kind(), current.executor(), current.category(),
                current.status(), runState);
    }
}
