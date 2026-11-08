package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardChanges;
import com.javadaba.contexts.officium.domain.CardRejection;
import com.javadaba.contexts.officium.domain.CardSearchCriteria;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Page;
import com.javadaba.contexts.officium.domain.ProjectFacets;
import com.javadaba.contexts.officium.domain.SendBack;
import com.javadaba.contexts.officium.domain.Status;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface CardRepository {

    Card insert(Card card);

    Optional<Card> findById(UUID projectId, UUID cardId);

    Optional<Card> findByKey(UUID projectId, String key);

    Optional<Card> findByClientKey(UUID projectId, String clientKey);

    Page<Card> search(UUID projectId, CardSearchCriteria criteria);

    /** Non-deleted card ids of one column, in {@code order}. What {@code OrderReindexer} needs
     *  before inserting/moving. */
    List<UUID> columnOrder(UUID projectId, Status status);

    /** Full-row optimistic update of every mutable field except status/order (those go through
     *  {@link #moveIfVersion}) -- {@code false} = version mismatch. */
    boolean updateIfVersion(Card updated, int expectedVersion);

    boolean deleteIfVersion(UUID projectId, UUID cardId, int expectedVersion, Instant deletedAt, Actor actor);

    /**
     * An agent acknowledged the card's latest human edit. Not a versioned write: it changes nothing
     * the card says, and bumping the version would turn a person's open edit into a conflict for
     * no reason. {@code false} if the card has no human edit to acknowledge.
     */
    boolean markHumanEditReviewed(UUID projectId, UUID cardId, Instant reviewedAt);

    /**
     * One transaction: moves the card to {@code newStatus}/its new {@code order}, reindexes both
     * the source and destination columns to the dense maps already computed by
     * {@code OrderReindexer}, and bumps the moving card's version. {@code false} = version
     * mismatch (nothing is written). {@code rejection} is what a card moved to rejected keeps
     * (card://JAVA-1415); null clears it, which every move out of rejected does.
     */
    default boolean moveIfVersion(UUID projectId, UUID cardId, int expectedVersion, Status newStatus,
            Map<UUID, Integer> sourceColumnOrder, Map<UUID, Integer> destColumnOrder, Instant now,
            CardRejection rejection) {
        return moveIfVersion(projectId, cardId, expectedVersion, newStatus, sourceColumnOrder, destColumnOrder, now,
                rejection, null);
    }

    /**
     * {@link #moveIfVersion} for a send-back (card://JAVA-1416): the same transaction also writes the
     * {@code sendBack}'s findings comment and its log entry, or nothing at all on a version mismatch.
     * {@code sendBack} is null for every move that is not one.
     */
    boolean moveIfVersion(UUID projectId, UUID cardId, int expectedVersion, Status newStatus,
            Map<UUID, Integer> sourceColumnOrder, Map<UUID, Integer> destColumnOrder, Instant now,
            CardRejection rejection, SendBack sendBack);

    /** Non-deleted card ids planned in one sprint ({@code null} = the backlog), in {@code rank}. */
    List<UUID> sprintOrder(UUID projectId, UUID sprintId);

    /**
     * {@link #moveIfVersion} for planning (JAVA-53): one transaction puts the card in
     * {@code sprintId} (null = backlog) at its new rank, reindexes both groups to the dense maps
     * already computed, and bumps the moving card's version. {@code false} = version mismatch.
     */
    boolean setSprintIfVersion(UUID projectId, UUID cardId, int expectedVersion, UUID sprintId,
            Map<UUID, Integer> sourceRanks, Map<UUID, Integer> destRanks, Instant now, Actor actor);

    /**
     * Moves many cards into {@code sprintId} (null = backlog) at once, appended after what's there
     * in the order given, one version up each -- a sprint completed or deleted sends its cards
     * somewhere without asking each of them for its version.
     */
    void reassignSprint(UUID projectId, List<UUID> cardIds, UUID sprintId, Instant now, Actor actor);

    /** Cards blocking {@code cardId} that are not in {@code deploy} -- empty means not blocked. */
    default List<Status> blockerStatuses(UUID cardId) {
        return List.copyOf(blockerStatusById(cardId).values());
    }

    /** Every live card with a {@code blocks} edge into {@code cardId}, with its status. */
    Map<UUID, Status> blockerStatusById(UUID cardId);

    /** {@link #blockerStatusById} for a whole list in one read: the blockers of each card, keyed by card. */
    default Map<UUID, Map<UUID, Status>> blockerStatusByCard(java.util.Collection<UUID> cardIds) {
        Map<UUID, Map<UUID, Status>> result = new java.util.LinkedHashMap<>();
        cardIds.forEach(id -> result.put(id, blockerStatusById(id)));
        return result;
    }

    /**
     * {@code cards.next} (JAVA-372): the {@code ai} card an agent should take now, from the active
     * sprint when there is one. Every phase the loop works is eligible -- Review, Ready, To do and
     * Refine -- ordered by priority, then in that phase order (finished work is verified before new
     * work starts), then board order. Never a blocked card, a {@code human} card or an epic, and never one of
     * {@code skip}: the cards an agent is on right now, since a Review or Refine card stays in its
     * column while it is being worked. {@code beyondSprint} (JAVA-1146) leaves the active sprint: an
     * eligible card outside it that blocks a blocked sprint card, else the best card in no sprint.
     */
    Optional<Card> nextEligible(UUID projectId, Set<UUID> skip, boolean beyondSprint);

    /** {@code human} cards, optionally narrowed to one assignee's account id (contract §3,
     *  {@code needs-human?assignee=me}). */
    List<Card> needsHuman(UUID projectId, UUID assigneeAccountId);

    /** Distinct epics/tags/assignees in use across the project's non-deleted cards
     *  (contract §3, {@code GET .../meta}). */
    ProjectFacets facets(UUID projectId);

    /** Every non-deleted card of the project, unpaged -- {@code backlog.py export} (JDB-235)
     *  needs the whole project at once, not a page of it. */
    List<Card> findAllByProject(UUID projectId);

    /** Every non-deleted card of this category in this status, across every project: the spike time box
     *  sweep (JAVA-878) reads the spikes in progress with it. */
    List<Card> findLive(Category category, Status status);

    /**
     * A board catching up (JAVA-45). {@code since == null}: every card the board shows (not
     * deleted, not {@code done}). Otherwise every card whose board face may have changed after
     * {@code since} -- whatever its status, so a card that left for Completed leaves the board too --
     * plus the ids of the ones deleted in that window.
     */
    CardChanges changedSince(UUID projectId, Instant since);
}
