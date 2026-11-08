package com.javadaba.contexts.officium.domain;

import java.util.regex.Pattern;

/**
 * An agent's {@code human} card is a wall a person answers, so it is born with its answer shape (JAVA-1783): a
 * form ({@code cards.attachForm}, or a form in {@code cards.create} or {@code cards.requestHuman}), or a line
 * {@code No form: <reason>} saying why it has none. The rule was held only by the prompt, and agents kept
 * creating walls with free-text questions, so the board refuses the card instead. A person creating a card is
 * never refused: they own the board.
 */
public final class HumanCardContract {

    private static final Pattern NO_FORM = CategoryContracts.labeledLine("No form");

    private HumanCardContract() {
    }

    /**
     * Refuses an agent's {@code human} card with neither a form nor a {@code No form:} line in its description.
     *
     * @param hasForm whether the card is born with a form, or gets one in the same call
     */
    public static void requireForm(ActorKind actor, Executor executor, boolean hasForm, String description) {
        if (actor != ActorKind.AGENT || executor != Executor.HUMAN || hasForm
                || CategoryContracts.hasLine(NO_FORM, description)) {
            return;
        }
        throw OfficiumException.conflict(CategoryContracts.CONTRACT_UNMET, "human card contract: a card a person "
                + "answers needs its answer shape. Give it a form (cards.attachForm, or the form argument of "
                + "cards.create or cards.requestHuman), or say why it has none with a line \"No form: <reason>\" "
                + "in its description.");
    }
}
