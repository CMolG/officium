package com.javadaba.contexts.officium.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Pure rules for a human card's form (JAVA-894): who answers it, when an answer moves the card, and
 * how an answer reads on the card.
 */
public final class CardFormRules {

    private CardFormRules() {
    }

    /** Only a human card is answered by a person, so only a human card carries a form. */
    public static void requireHumanCard(Card card) {
        if (card.executor() != Executor.HUMAN) {
            throw OfficiumException.conflict("form_needs_human_card",
                    "Only a human card carries a form: " + card.key() + " is run by an agent");
        }
    }

    /**
     * The assignee a respondent is, when answering is theirs to do: the card is human, still waiting
     * on its person ({@link Status#needsPerson()}, so a card already in Ready or beyond is never moved
     * back) and the respondent is one of its assignees by account. A free-text assignee has no account
     * and never matches; neither does a stranger, or an anonymous respondent.
     */
    public static Optional<Assignee> answeringAssignee(Card card, UUID respondentAccountId) {
        if (respondentAccountId == null || card.executor() != Executor.HUMAN || !card.status().needsPerson()) {
            return Optional.empty();
        }
        return card.assignees().stream()
                .filter(assignee -> respondentAccountId.equals(assignee.accountId()))
                .findFirst();
    }

    /**
     * Where the form stands on a card: {@code open} while the card waits on its person, {@code answered}
     * once it has moved on with an answer on it, {@code closed} when it moved on without one.
     */
    public static String state(Status status, boolean hasAnswers) {
        if (status.needsPerson()) {
            return "open";
        }
        return hasAnswers ? "answered" : "closed";
    }

    /** The answers as the comment the person leaves on the card: Markdown, one question per block. */
    public static String comment(List<AnsweredQuestion> answers) {
        StringBuilder text = new StringBuilder("Answered the form:");
        for (AnsweredQuestion answer : answers) {
            text.append("\n\n**").append(answer.prompt()).append("**\n").append(show(answer.value()));
        }
        return text.toString();
    }

    private static String show(Object value) {
        if (value instanceof Boolean yes) {
            return yes ? "Yes" : "No";
        }
        if (value instanceof List<?> list) {
            return String.join(", ", list.stream().map(String::valueOf).toList());
        }
        return String.valueOf(value);
    }
}
