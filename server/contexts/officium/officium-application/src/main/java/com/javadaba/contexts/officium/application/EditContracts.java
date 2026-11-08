package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.ActorKind;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CategoryContracts;
import com.javadaba.contexts.officium.domain.GoverningWorkflow;
import com.javadaba.contexts.officium.domain.PlanContract;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.CardRepository;

/**
 * What an edit of a card must meet (JAVA-1592): its scope is held ({@link CategoryContracts#requireScopeHeld}), and
 * an action plan is not set on a Refine card before its workflow ({@link PlanContract#requireWorkflowFirst}). Kept
 * apart from {@code CardService}, which is over its size ceiling, and in the application package beside it so that
 * the service needs no import for it.
 */
public final class EditContracts {

    private EditContracts() {
    }

    /** {@code cards} reads a Refine card's epic: the workflow its plan waits for is the epic's once that is written. */
    public static void require(ActorKind actor, Card current, Card edited, CardRepository cards) {
        CategoryContracts.requireScopeHeld(actor, current, edited);
        PlanContract.requireWorkflowFirst(current.executor(), current.category(), current.status(),
                current.status() == Status.REFINE
                        ? GoverningWorkflow.of(current, cards).workflow()
                        : current.workflow(),
                current.actionPlan(), edited.actionPlan());
    }
}
