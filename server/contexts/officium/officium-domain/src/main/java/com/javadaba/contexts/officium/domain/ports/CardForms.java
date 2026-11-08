package com.javadaba.contexts.officium.domain.ports;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Quaestio, in process (JAVA-894): Officium makes the form a human card is answered with and keeps
 * only its address. The form is owned by the system, so it never shows in anybody's Quaestio and its
 * questions are changed only from here; Quaestio stays unaware of Officium.
 */
public interface CardForms {

    /**
     * Quaestio's rules over a draft, before anything is saved (JAVA-891): its structure validator and
     * its authoring lint (JAVA-892). Throws a bad request that says each problem in words, with the
     * question id.
     */
    void check(List<QuestionDraft> questions, List<String> languages);

    /**
     * A new published form, closed to anyone who is not a member of the card's project.
     *
     * @param languages the languages it is filled in, the default first (JAVA-1082); each question
     *        carries its text in every other one
     */
    Published publish(String title, List<String> languages, List<QuestionDraft> questions);

    /** Gives an existing form these languages and questions, as a new version. */
    void replace(UUID formId, String title, List<String> languages, List<QuestionDraft> questions);

    record Published(UUID formId, String slug) {
    }

    /**
     * @param kind a Quaestio question kind: STATEMENT, TEXT, LONG_TEXT, YES_NO, CHOICE, MULTI_CHOICE,
     *        RATING, NPS, EMAIL, NUMBER or DATE
     * @param options the choices of a CHOICE or MULTI_CHOICE
     * @param logic jump rules, in order; the authoring lint asks for them when a choice has an
     *        "Other" follow-up
     */
    record QuestionDraft(String id, String kind, String prompt, String help, boolean required,
            List<String> options, List<Logic> logic, Map<String, Text> translations) {

        public QuestionDraft {
            options = options == null ? List.of() : List.copyOf(options);
            logic = logic == null ? List.of() : List.copyOf(logic);
            translations = translations == null ? Map.of() : Map.copyOf(translations);
        }

        public QuestionDraft(String id, String kind, String prompt, String help, boolean required,
                List<String> options, List<Logic> logic) {
            this(id, kind, prompt, help, required, options, logic, Map.of());
        }

        public QuestionDraft(String id, String kind, String prompt, String help, boolean required,
                List<String> options) {
            this(id, kind, prompt, help, required, options, List.of());
        }

        /** A statement is read, not answered. */
        public boolean isQuestion() {
            return !"STATEMENT".equalsIgnoreCase(kind);
        }
    }

    /** A question's text in one of the form's other languages; {@code options} index for index with the default ones. */
    record Text(String prompt, String help, List<String> options) {

        public Text {
            options = options == null ? List.of() : List.copyOf(options);
        }
    }

    /** One jump rule of a question: {@code op} is EQUALS, IN or ANSWERED, {@code goTo} a question id or END. */
    record Logic(String questionId, String op, List<String> value, String goTo) {

        public Logic {
            value = value == null ? List.of() : List.copyOf(value);
        }
    }
}
