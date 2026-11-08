package com.javadaba.apps.local.standins;

import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.ports.CardForms;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

/** Forms attached to cards need the form engine of Officium Cloud. */
@ApplicationScoped
public class LocalCardForms implements CardForms {

    private static OfficiumException unavailable() {
        return new OfficiumException("feature_unavailable_in_local",
                "Forms on cards are part of Officium Cloud and are not available in Officium Local.", 501);
    }

    @Override
    public void check(List<QuestionDraft> questions, List<String> languages) {
        throw unavailable();
    }

    @Override
    public Published publish(String title, List<String> languages, List<QuestionDraft> questions) {
        throw unavailable();
    }

    @Override
    public void replace(UUID formId, String title, List<String> languages, List<QuestionDraft> questions) {
        throw unavailable();
    }
}
