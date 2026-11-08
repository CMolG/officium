package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.UUID;

/** A project's documentation settings (JAVA-794). No stored row means the defaults, at version 0. */
public record DocSettings(UUID projectId, int historyDays, int version, Actor updatedBy, Instant updatedAt) {

    public static final int DEFAULT_HISTORY_DAYS = 15;
    public static final int MAX_HISTORY_DAYS = 3650;

    public static DocSettings defaults(UUID projectId) {
        return new DocSettings(projectId, DEFAULT_HISTORY_DAYS, 0, null, null);
    }

    public DocSettings withHistoryDays(int days, Actor actor, Instant now) {
        if (days < 0 || days > MAX_HISTORY_DAYS) {
            throw OfficiumException.badRequest("invalid_history_days",
                    "History is kept for 0 to " + MAX_HISTORY_DAYS + " days");
        }
        return new DocSettings(projectId, days, version + 1, actor, now);
    }
}
