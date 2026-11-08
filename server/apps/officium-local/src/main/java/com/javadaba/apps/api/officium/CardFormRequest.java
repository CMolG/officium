package com.javadaba.apps.api.officium;

import com.javadaba.contexts.officium.application.CardFormService;
import com.javadaba.contexts.officium.domain.ports.CardForms;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The form a human card is answered with, as REST receives it (JAVA-894): {@code title} left out is
 * the card's own, {@code languages} left out are the project's (JAVA-1082), and each question may
 * carry its text in the form's other languages. Its own file since JAVA-1082:
 * {@code OfficiumCardResource} is at its size allowance.
 */
public record CardFormRequest(String title, List<String> languages, List<Question> questions) {

    public record Question(String id, String kind, String prompt, String help, boolean required,
            List<String> options, List<Logic> logic, Map<String, Text> translations) {
    }

    public record Logic(String questionId, String op, List<String> value, String goTo) {
    }

    /** The question's text in one of the form's other languages; options index for index with its own. */
    public record Text(String prompt, String help, List<String> options) {
    }

    static CardFormService.FormSpec toSpec(CardFormRequest request) {
        List<CardForms.QuestionDraft> questions = request == null || request.questions() == null
                ? List.of()
                : request.questions().stream().map(CardFormRequest::draft).toList();
        return new CardFormService.FormSpec(request == null ? null : request.title(), questions,
                request == null ? null : request.languages());
    }

    private static CardForms.QuestionDraft draft(Question q) {
        List<CardForms.Logic> logic = q.logic() == null
                ? List.of()
                : q.logic().stream().map(r -> new CardForms.Logic(r.questionId(), r.op(), r.value(), r.goTo()))
                        .toList();
        Map<String, CardForms.Text> translations = new LinkedHashMap<>();
        if (q.translations() != null) {
            q.translations().forEach((lang, t) -> translations.put(lang,
                    new CardForms.Text(t.prompt(), t.help(), t.options())));
        }
        return new CardForms.QuestionDraft(q.id(), q.kind(), q.prompt(), q.help(), q.required(), q.options(), logic,
                translations);
    }
}
