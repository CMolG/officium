package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.AnsweredQuestion;
import com.javadaba.contexts.officium.domain.CardForm;
import com.javadaba.contexts.officium.domain.CardFormAnswer;
import com.javadaba.contexts.officium.domain.CardFormRules;
import com.javadaba.contexts.officium.domain.Status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * A human card's form as the card shows it (JAVA-894). {@code state} is {@code open} while the card
 * waits on its person, {@code answered} once it moved on with an answer, {@code closed} when it moved
 * on without one. {@code answers} are the latest answer's, only while {@code answered}; {@code history}
 * is every answer the form took, oldest first. {@code lang} is the language the latest answer was filled in.
 *
 * @param fillPath where the form is filled, in Quaestio
 * @param answeredAt when the latest answer came in; null while there is none
 */
public record CardFormView(UUID formId, String slug, String fillPath, int questionCount, String state,
        List<AnsweredQuestion> answers, Instant answeredAt, String lang, List<Answer> history) {

    private static final String FILL_PATH = "/quaestio/f/";

    /** One answer of the history, with who gave it and when. */
    public record Answer(UUID responseId, UUID respondentAccountId, String respondentName, Instant answeredAt,
            List<AnsweredQuestion> answers, String lang) {
    }

    static CardFormView of(CardForm form, Status cardStatus, List<CardFormAnswer> answers) {
        String state = CardFormRules.state(cardStatus, !answers.isEmpty());
        CardFormAnswer latest = answers.isEmpty() ? null : answers.getLast();
        boolean answered = "answered".equals(state);
        return new CardFormView(form.formId(), form.slug(), FILL_PATH + form.slug(), form.questionCount(), state,
                answered ? latest.answers() : List.of(), latest == null ? null : latest.answeredAt(),
                latest == null ? null : latest.lang(),
                answers.stream().map(a -> new Answer(a.responseId(), a.respondentAccountId(), a.respondentName(),
                        a.answeredAt(), a.answers(), a.lang())).toList());
    }
}
