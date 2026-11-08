package com.javadaba.apps.local.standins;

import com.javadaba.contexts.officium.domain.ports.SummonsInbox;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** Summons are not delivered anywhere in Officium Local; cards waiting on a person show on the board. */
@ApplicationScoped
public class LocalSummonsInbox implements SummonsInbox {

    @Override
    public void publish(UUID accountId, List<Entry> entries) {
        // No inbox to deliver to.
    }

    @Override
    public void retract(UUID accountId, Collection<String> itemIds) {
        // No inbox to retract from.
    }
}
