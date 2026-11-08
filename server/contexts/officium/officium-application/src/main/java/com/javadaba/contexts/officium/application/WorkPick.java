package com.javadaba.contexts.officium.application;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

/**
 * What {@code cards.next} hands out (card://JAVA-1874): a card, flattened onto the wire exactly as before, and its
 * {@code sweep} when the card is an epic handed out as one unit; null for every card worked alone, so a project that
 * executes card by card reads the same answer it always did plus {@code sweep: null}.
 */
public record WorkPick(@JsonUnwrapped CardView card, SweepView sweep) {

    static WorkPick alone(CardView card) {
        return new WorkPick(card, null);
    }
}
