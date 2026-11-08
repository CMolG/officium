package com.javadaba.contexts.officium.domain;

import java.util.Objects;
import java.util.UUID;

/**
 * Why a rejected card was rejected (card://JAVA-1415): the reason from the closed list, the note
 * saying what was wrong, and the card it names, when it names one. Stored on the card so it can be
 * searched and counted; {@link Card} holds it only while its status is {@link Status#REJECTED}.
 */
public record CardRejection(RejectionReason reason, String note, UUID cardId) {

    public CardRejection {
        Objects.requireNonNull(reason, "reason");
        Objects.requireNonNull(note, "note");
    }
}
