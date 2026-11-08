package com.javadaba.contexts.officium.domain;

import java.util.UUID;

/**
 * One thing a person is summoned for: an open {@code request} an agent waits on, or a human card's
 * {@code form} that blocks an AI card. {@code cardKey} is the card to answer on; {@code unblocks}
 * the key of the AI card that waits.
 */
public record SummonsItem(String id, String kind, UUID cardId, String cardKey, String cardTitle, String unblocks,
        UUID requestId, String action, String detail) {

    public static final String FORM = "form";
    public static final String REQUEST = "request";

    public static String requestId(UUID requestId) {
        return REQUEST + ":" + requestId;
    }

    public static String formId(UUID cardId) {
        return FORM + ":" + cardId;
    }
}
