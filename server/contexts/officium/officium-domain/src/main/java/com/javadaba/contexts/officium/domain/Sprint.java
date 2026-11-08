package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/**
 * A sprint (JAVA-53, contract §8.2): planned, then active, then closed, and never back. Cards point
 * at their sprint ({@code Card#sprintId}); a card with none is in the backlog. "At most one active
 * sprint per project" needs the other sprints, so the service checks it and a partial unique index
 * holds it in the database too; what one sprint alone can say is here.
 */
public record Sprint(UUID id, UUID projectId, int number, String name, String goal, SprintState state,
        LocalDate startDate, LocalDate endDate, Instant startedAt, Instant closedAt, int order, int version,
        Instant createdAt, Instant updatedAt) {

    public Sprint {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(projectId, "projectId");
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(state, "state");
        goal = goal == null ? "" : goal;
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw OfficiumException.badRequest("invalid_sprint_dates", "A sprint can't end before it starts");
        }
    }

    public static String defaultName(String keyPrefix, int number) {
        return keyPrefix + " Sprint " + number;
    }

    public Sprint edited(String newName, String newGoal, LocalDate newStart, LocalDate newEnd, Instant now) {
        String resolvedName = newName == null ? name : newName.strip();
        if (resolvedName.isBlank()) {
            throw OfficiumException.badRequest("name_required", "A sprint needs a name");
        }
        return new Sprint(id, projectId, number, resolvedName, newGoal == null ? goal : newGoal,
                state, newStart == null ? startDate : newStart, newEnd == null ? endDate : newEnd, startedAt,
                closedAt, order, version + 1, createdAt, now);
    }

    public Sprint reordered(int newOrder, Instant now) {
        return new Sprint(id, projectId, number, name, goal, state, startDate, endDate, startedAt, closedAt,
                newOrder, version + 1, createdAt, now);
    }

    /** Planned -> active. Planned dates given here replace the ones it had. */
    public Sprint started(LocalDate newStart, LocalDate newEnd, Instant now) {
        if (state != SprintState.PLANNED) {
            throw OfficiumException.conflict("sprint_not_planned", "Only a planned sprint can start");
        }
        return new Sprint(id, projectId, number, name, goal, SprintState.ACTIVE,
                newStart == null ? startDate : newStart, newEnd == null ? endDate : newEnd, now, null, order,
                version + 1, createdAt, now);
    }

    /** Active -> closed. Where its unfinished cards go is the service's, since it moves cards. */
    public Sprint completed(Instant now) {
        if (state != SprintState.ACTIVE) {
            throw OfficiumException.conflict("sprint_not_active", "Only the active sprint can be completed");
        }
        return new Sprint(id, projectId, number, name, goal, SprintState.CLOSED, startDate, endDate, startedAt, now,
                order, version + 1, createdAt, now);
    }

    public void requireDeletable() {
        if (state != SprintState.PLANNED) {
            throw OfficiumException.conflict("sprint_not_planned", "Only a planned sprint can be deleted");
        }
    }

    /** Can a card be put in it? Not once it's closed: a closed sprint is a record of what happened. */
    public void requireOpen() {
        if (state == SprintState.CLOSED) {
            throw OfficiumException.conflict("sprint_closed", "That sprint is closed");
        }
    }
}
