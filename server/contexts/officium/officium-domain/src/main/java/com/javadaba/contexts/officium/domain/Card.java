package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * The aggregate. Links ({@code related}/{@code blocks}/{@code blockedBy}) are NOT stored here --
 * they're relational ({@link CardLink}, {@code CardLinkRepository}) and get composed onto the
 * wire shape by {@code officium-application}'s view records, same reasoning as {@code
 * CardDetail} composing comments/time/attachments on top of {@code Card} in the contract.
 *
 * <p>Two texts, both Markdown: {@code description} says what the card is; {@code actionPlan} says
 * how it will be tackled, written by whoever picks it up -- a person or an agent (user request,
 * 2026-09-23). {@code humanEdit} is null until a person changes what the card says, and
 * {@code category} until someone says what kind of work the card is.
 *
 * <p>{@code sprintId}/{@code rank} are where the card is PLANNED (contract §8.2). They change like
 * {@code status}/{@code order} do, through their own write ({@code CardRepository#setSprintIfVersion}),
 * never through a content edit.
 */
public record Card(
        UUID id,
        UUID projectId,
        String key,
        int number,
        String title,
        String description,
        String actionPlan,
        Status status,
        RunState runState,
        Priority priority,
        Executor executor,
        Category category,
        int order,
        double estimate,
        String epic,
        List<String> tags,
        List<Assignee> assignees,
        int version,
        Instant createdAt,
        Instant updatedAt,
        Actor createdBy,
        Actor updatedBy,
        Instant deletedAt,
        String clientKey,
        HumanEdit humanEdit,
        /** Null while the card is in the backlog (JAVA-53). */
        UUID sprintId,
        /** Dense position inside its sprint, or inside the backlog: what {@code order} is to a column. */
        int rank,
        /** What about its work brings roles its category alone does not (JAVA-294), in enum order. */
        List<Signal> signals,
        /** A spike's subtype (JAVA-391): {@code technical} when none was given, null off a spike. */
        SpikeSubtype subtype,
        /** Why it was rejected (card://JAVA-1415): null whenever the card is not {@link Status#REJECTED}. */
        CardRejection rejection,
        /** The card's own workflow (card://JAVA-1591), or null: the role matrix answers for every phase. */
        CardWorkflow workflow) {

    private static final int EXCERPT_LENGTH = 160;

    /** A card that is not rejected: every writer but a move into or within {@link Status#REJECTED}. */
    public Card(UUID id, UUID projectId, String key, int number, String title, String description, String actionPlan,
            Status status, RunState runState, Priority priority, Executor executor, Category category, int order,
            double estimate, String epic, List<String> tags, List<Assignee> assignees, int version, Instant createdAt,
            Instant updatedAt, Actor createdBy, Actor updatedBy, Instant deletedAt, String clientKey,
            HumanEdit humanEdit, UUID sprintId, int rank, List<Signal> signals, SpikeSubtype subtype) {
        this(id, projectId, key, number, title, description, actionPlan, status, runState, priority, executor,
                category, order, estimate, epic, tags, assignees, version, createdAt, updatedAt, createdBy, updatedBy,
                deletedAt, clientKey, humanEdit, sprintId, rank, signals, subtype, null);
    }

    /** A card without a workflow of its own: every writer that predates JAVA-1591. */
    public Card(UUID id, UUID projectId, String key, int number, String title, String description, String actionPlan,
            Status status, RunState runState, Priority priority, Executor executor, Category category, int order,
            double estimate, String epic, List<String> tags, List<Assignee> assignees, int version, Instant createdAt,
            Instant updatedAt, Actor createdBy, Actor updatedBy, Instant deletedAt, String clientKey,
            HumanEdit humanEdit, UUID sprintId, int rank, List<Signal> signals, SpikeSubtype subtype,
            CardRejection rejection) {
        this(id, projectId, key, number, title, description, actionPlan, status, runState, priority, executor,
                category, order, estimate, epic, tags, assignees, version, createdAt, updatedAt, createdBy, updatedBy,
                deletedAt, clientKey, humanEdit, sprintId, rank, signals, subtype, rejection, null);
    }

    public Card {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(projectId, "projectId");
        Objects.requireNonNull(key, "key");
        Objects.requireNonNull(title, "title");
        Objects.requireNonNull(status, "status");
        Objects.requireNonNull(runState, "runState");
        Objects.requireNonNull(priority, "priority");
        Objects.requireNonNull(executor, "executor");
        tags = tags == null ? List.of() : List.copyOf(tags);
        assignees = assignees == null ? List.of() : List.copyOf(assignees);
        signals = Signal.normalized(signals);
        subtype = category != Category.SPIKE ? null : subtype == null ? SpikeSubtype.TECHNICAL : subtype;
        rejection = status == Status.REJECTED ? rejection : null;
    }

    public boolean deleted() {
        return deletedAt != null;
    }

    /** The description as the one line of plain text the board and agents read -- never Markdown. */
    public String excerpt() {
        return MarkdownText.excerpt(description, EXCERPT_LENGTH);
    }

    public boolean humanEditPending() {
        return humanEdit != null && humanEdit.pending();
    }

    /**
     * Does {@code other} say the same thing? The fields a person edits -- a save that changes none
     * of them is not an edit: no new version, no history entry, no {@link HumanEdit}. Blank text and
     * no text are the same text.
     */
    public boolean sameContentAs(Card other) {
        return title.equals(other.title)
                && sameText(description, other.description)
                && sameText(actionPlan, other.actionPlan)
                && priority == other.priority
                && category == other.category
                && Double.compare(estimate, other.estimate) == 0
                && sameText(epic, other.epic)
                && tags.equals(other.tags)
                && assignees.equals(other.assignees)
                && signals.equals(other.signals)
                && subtype == other.subtype;
    }

    private static boolean sameText(String a, String b) {
        return (a == null ? "" : a).equals(b == null ? "" : b);
    }

    /** The same card after a write that changes nothing it says: one version up, stamped by who. */
    public Card touched(Actor actor, Instant at) {
        return new Card(id, projectId, key, number, title, description, actionPlan, status, runState, priority,
                executor, category, order, estimate, epic, tags, assignees, version + 1, createdAt, at, createdBy,
                actor, deletedAt, clientKey, humanEdit, sprintId, rank, signals, subtype, rejection, workflow);
    }

    /** {@link #touched}, and if the writer is a person, a {@link HumanEdit} made now. */
    public Card editedBy(Actor actor, Instant at) {
        Card touched = touched(actor, at);
        return actor.kind() == ActorKind.PERSON
                ? touched.withHumanEdit(HumanEdit.after(humanEdit, actor, at))
                : touched;
    }

    /** The same card at another priority: what a precedence rule's floor raises it to (JAVA-1686). */
    public Card withPriority(Priority priority) {
        return new Card(id, projectId, key, number, title, description, actionPlan, status, runState, priority,
                executor, category, order, estimate, epic, tags, assignees, version, createdAt, updatedAt, createdBy,
                updatedBy, deletedAt, clientKey, humanEdit, sprintId, rank, signals, subtype, rejection, workflow);
    }

    /** The same card moved to a sprint (null: the backlog), as a precedence backfill does (JAVA-1691). */
    public Card withSprint(UUID next) {
        return new Card(id, projectId, key, number, title, description, actionPlan, status, runState, priority,
                executor, category, order, estimate, epic, tags, assignees, version, createdAt, updatedAt, createdBy,
                updatedBy, deletedAt, clientKey, humanEdit, next, rank, signals, subtype, rejection, workflow);
    }

    public Card withHumanEdit(HumanEdit edit) {
        return new Card(id, projectId, key, number, title, description, actionPlan, status, runState, priority,
                executor, category, order, estimate, epic, tags, assignees, version, createdAt, updatedAt, createdBy,
                updatedBy, deletedAt, clientKey, edit, sprintId, rank, signals, subtype, rejection, workflow);
    }

    /** The same card with its workflow set, or cleared with null; the caller stamps the write ({@link #editedBy}). */
    public Card withWorkflow(CardWorkflow next) {
        return new Card(id, projectId, key, number, title, description, actionPlan, status, runState, priority,
                executor, category, order, estimate, epic, tags, assignees, version, createdAt, updatedAt, createdBy,
                updatedBy, deletedAt, clientKey, humanEdit, sprintId, rank, signals, subtype, rejection, next);
    }
}
