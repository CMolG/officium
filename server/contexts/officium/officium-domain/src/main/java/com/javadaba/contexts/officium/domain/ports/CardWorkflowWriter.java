package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Card;

/** Writes a card's workflow (card://JAVA-1591), its version and its stamp in one statement, if the version still matches. */
public interface CardWorkflowWriter {

    /** True when the stored version was {@code expectedVersion} and {@code updated} is now what the card says. */
    boolean updateIfVersion(Card updated, int expectedVersion);
}
