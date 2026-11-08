package com.javadaba.contexts.officium.domain;

import java.util.UUID;

/**
 * `GET /officium/v1/projects/{id}/cards` filters (contract §3). {@code assignee} is already
 * resolved by the service ({@code "me"} -> the caller's account id) before it reaches the
 * repository -- ports don't know about sessions.
 */
public record CardSearchCriteria(
        String text,
        Status status,
        Priority priority,
        String epic,
        String tag,
        AssigneeFilter assignee,
        Executor executor,
        Category category,
        Boolean blocked,
        /** {@code true}: only cards a person changed since an agent last acknowledged it. */
        Boolean humanEditPending,
        /** Null: any sprint or none. Otherwise the cards planned in one sprint, or in the backlog. */
        SprintFilter sprint,
        Sort sort,
        String cursor,
        int limit,
        /** Null: any. Otherwise only the cards carrying this signal (JAVA-294). */
        Signal signal,
        /** Null: any. Otherwise only the cards rejected for this reason (card://JAVA-1415). */
        RejectionReason rejection) {

    public CardSearchCriteria(String text, Status status, Priority priority, String epic, String tag,
            AssigneeFilter assignee, Executor executor, Category category, Boolean blocked, Boolean humanEditPending,
            SprintFilter sprint, Sort sort, String cursor, int limit) {
        this(text, status, priority, epic, tag, assignee, executor, category, blocked, humanEditPending, sprint, sort,
                cursor, limit, null);
    }

    public CardSearchCriteria(String text, Status status, Priority priority, String epic, String tag,
            AssigneeFilter assignee, Executor executor, Category category, Boolean blocked, Boolean humanEditPending,
            SprintFilter sprint, Sort sort, String cursor, int limit, Signal signal) {
        this(text, status, priority, epic, tag, assignee, executor, category, blocked, humanEditPending, sprint, sort,
                cursor, limit, signal, null);
    }

    public enum Sort {
        ORDER, PRIORITY, UPDATED, CREATED
    }

    public record AssigneeFilter(UUID accountId, String name) {
    }

    /** {@code sprintId == null} is the backlog. {@code "active"} is resolved to an id by the service
     *  before it gets here -- or to {@link #NONE} when no sprint is active, which matches nothing. */
    public record SprintFilter(UUID sprintId, boolean none) {

        public static final SprintFilter BACKLOG = new SprintFilter(null, false);
        public static final SprintFilter NONE = new SprintFilter(null, true);

        public static SprintFilter of(UUID sprintId) {
            return new SprintFilter(sprintId, false);
        }

        public boolean matches(UUID cardSprintId) {
            return !none && java.util.Objects.equals(sprintId, cardSprintId);
        }
    }

    /** The same filters over another page: the role filter reads every candidate, then pages what it kept. */
    public CardSearchCriteria withWindow(String cursor, int limit) {
        return new CardSearchCriteria(text, status, priority, epic, tag, assignee, executor, category, blocked,
                humanEditPending, sprint, sort, cursor, limit, signal, rejection);
    }

    public boolean matchesSignal(Card card) {
        return signal == null || card.signals().contains(signal);
    }

    public boolean matchesRejection(Card card) {
        return rejection == null || (card.rejection() != null && card.rejection().reason() == rejection);
    }

    public CardSearchCriteria {
        if (limit <= 0) {
            limit = 50;
        }
        if (sort == null) {
            sort = Sort.ORDER;
        }
    }
}
