package com.javadaba.contexts.officium.domain.ports;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * The account's inbox, where a summons item also lands (JAVA-1624): the diamond-menu center keeps it
 * when a toast is dismissed. An item is keyed by its summons item id, so a new round replaces it and
 * a closed one is retracted.
 */
public interface SummonsInbox {

    /** One entry per pending item of a round. {@code link} is the deep link that answers it. */
    void publish(UUID accountId, List<Entry> entries);

    /** Withdraws the entries of these summons item ids, read or unread. */
    void retract(UUID accountId, Collection<String> itemIds);

    record Entry(String itemId, String title, String link) {
    }
}
