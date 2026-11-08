package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * What the assignee answered the day the form moved the card to Ready (JAVA-894). Every answer
 * stays: a card an agent sends back to To do takes a new one, and the old ones are its history.
 * {@code lang} is the language it was filled in (JAVA-1082); the answers read the same in any of them.
 */
public record CardFormAnswer(UUID id, UUID cardFormId, UUID responseId, UUID respondentAccountId,
        String respondentName, List<AnsweredQuestion> answers, Instant answeredAt, String lang) {

    public CardFormAnswer {
        answers = answers == null ? List.of() : List.copyOf(answers);
    }
}
