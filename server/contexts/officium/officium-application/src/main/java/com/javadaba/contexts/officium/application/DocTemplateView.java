package com.javadaba.contexts.officium.application;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.javadaba.contexts.officium.domain.DocPageSummary;
import com.javadaba.contexts.officium.domain.DocTemplate;

/**
 * A template in the Templates section (JAVA-801, contract §8.23): its summary, plus the collection it
 * belongs to, which its path says ({@code null}: the project's).
 */
public record DocTemplateView(@JsonUnwrapped DocPageView.Summary page, String collection) {

    static DocTemplateView of(DocPageSummary template) {
        return new DocTemplateView(DocPageView.Summary.of(template), DocTemplate.collectionOf(template.path()));
    }
}
