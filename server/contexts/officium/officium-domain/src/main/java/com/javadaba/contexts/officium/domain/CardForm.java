package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * The Quaestio form a human card is answered with (JAVA-894): one per card. The form itself lives in
 * forms, owned by the system and closed to everybody but the card's project; this is only the link
 * and what the card needs to show of it.
 *
 * @param slug the form's unguessable address in Quaestio
 * @param questionCount the questions a person answers, statements not counted
 */
public record CardForm(UUID id, UUID projectId, UUID cardId, UUID formId, String slug, int questionCount,
        Instant createdAt) {

    public CardForm {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(projectId, "projectId");
        Objects.requireNonNull(cardId, "cardId");
        Objects.requireNonNull(formId, "formId");
        Objects.requireNonNull(slug, "slug");
    }
}
