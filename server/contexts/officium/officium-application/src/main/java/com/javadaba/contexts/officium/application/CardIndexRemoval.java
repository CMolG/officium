package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.ports.SearchIndexPort;

import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

/** Takes a deleted card out of the search index; a failure is logged, never raised, since the delete stands. */
final class CardIndexRemoval {

    private static final Logger LOG = Logger.getLogger(CardIndexRemoval.class.getName());

    private CardIndexRemoval() {
    }

    static void remove(SearchIndexPort searchIndex, UUID cardId) {
        try {
            searchIndex.indexRemove(cardId);
        } catch (RuntimeException notIndexed) {
            LOG.log(Level.WARNING, "Card " + cardId + " deleted but the search index was not updated", notIndexed);
        }
    }
}
