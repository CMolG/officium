package com.javadaba.contexts.officium.application;

import java.util.UUID;

/**
 * Told of every committed write to an existing card (JAVA-882), so another product that follows a
 * card can follow it without Officium knowing who it is: Adiutor keeps a bridged task in step with
 * its card through this port. {@link ActivityPublisher#publish} calls each one after the change
 * event, never for {@code card.created}, and a listener that throws is logged and ignored, so it
 * can never fail the write that told it.
 */
public interface CardChangeListener {

    void cardChanged(CardChange change);

    /**
     * @param type the change event's type: {@code card.updated}, {@code card.moved}, {@code card.deleted}, ...
     * @param version the card's version after the write; on a delete, the one after its last
     */
    record CardChange(String type, UUID projectId, UUID cardId, String cardKey, Integer version) {

        public boolean deleted() {
            return "card.deleted".equals(type);
        }
    }
}
