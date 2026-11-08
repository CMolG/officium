package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.ActivityEntry;
import com.javadaba.contexts.officium.domain.Page;

import java.util.UUID;

public interface ActivityRepository {

    ActivityEntry insert(ActivityEntry entry);

    Page<ActivityEntry> list(UUID projectId, UUID cardId, String cursor, int limit);

    /** Every entry of one operation in the project, oldest first -- the moves the metrics read. */
    java.util.List<ActivityEntry> listByOperation(UUID projectId, String operation);

    /** {@link #listByOperation} for one card: the index on the card, not a scan of the project's log. */
    default java.util.List<ActivityEntry> listByCard(UUID projectId, UUID cardId, String operation) {
        return listByOperation(projectId, operation).stream().filter(entry -> cardId.equals(entry.cardId())).toList();
    }
}
