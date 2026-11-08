package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.DeliveryFlow;
import com.javadaba.contexts.officium.domain.EpicChildren;
import com.javadaba.contexts.officium.domain.EpicStatus;
import com.javadaba.contexts.officium.domain.OrderReindexer;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.CardRepository;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.logging.Logger;

/**
 * An epic follows its children (card://JAVA-379): after a write that may have changed an epic's
 * children or their statuses, every epic of the project moves to the status its children give it
 * ({@link EpicStatus#follow}). {@link CardService} owns it; it lives apart only to keep that class
 * under its size bar (card://JAVA-1415).
 */
final class EpicFollower {

    private static final Logger LOG = Logger.getLogger(EpicFollower.class.getName());

    private final CardRepository cards;
    private final ActivityPublisher activity;
    private final Consumer<Card> reindex;
    private final Clock clock;

    EpicFollower(CardRepository cards, ActivityPublisher activity, Consumer<Card> reindex, Clock clock) {
        this.cards = cards;
        this.activity = activity;
        this.reindex = reindex;
        this.clock = clock;
    }

    /**
     * Whether a write to this card can change an epic's children or their statuses: it names an epic,
     * or it is one (an epic's own label is how cards naming that label find it). Every other write
     * skips the project scan below.
     */
    static boolean shapesAnEpic(Card card) {
        return card.category() == Category.EPIC || (card.epic() != null && !card.epic().isBlank());
    }

    /**
     * Moves every epic of the project to the status its children give it. Project-wide on purpose: a
     * card can leave one epic for another, an epic's label can take children from another, and an epic
     * written before this rule converges on the first write that touches its project's epics. An epic
     * of an epic follows the epic, so it runs until nothing moves. The triggering write is already
     * saved, so a race with another writer is read again once and then only logged: the next write
     * converges it.
     */
    void follow(UUID projectId, Actor actor) {
        for (int attempt = 0; attempt < 2; attempt++) {
            if (followOnce(projectId, actor)) {
                return;
            }
        }
        LOG.warning("Epics of project " + projectId + " not moved to their children's status: raced twice");
    }

    private boolean followOnce(UUID projectId, Actor actor) {
        List<Card> project = cards.findAllByProject(projectId);
        Map<String, List<Card>> byEpic = EpicChildren.byEpic(project);
        if (byEpic.isEmpty()) {
            return true;
        }
        Map<UUID, Status> statusOf = new HashMap<>();
        project.forEach(card -> statusOf.put(card.id(), card.status()));
        Map<String, Card> epicOf = new HashMap<>();
        project.stream().filter(card -> byEpic.containsKey(card.key())).forEach(card -> epicOf.put(card.key(), card));
        boolean changed = true;
        for (int pass = 0; changed && pass <= byEpic.size(); pass++) {
            changed = false;
            for (Map.Entry<String, List<Card>> entry : byEpic.entrySet()) {
                UUID epicId = epicOf.get(entry.getKey()).id();
                Optional<Status> to = EpicStatus.follow(statusOf.get(epicId), statusesOf(entry.getValue(), statusOf));
                if (to.isPresent()) {
                    statusOf.put(epicId, to.get());
                    changed = true;
                }
            }
        }
        boolean allWritten = true;
        for (Map.Entry<String, List<Card>> entry : byEpic.entrySet()) {
            Card epic = epicOf.get(entry.getKey());
            Status to = statusOf.get(epic.id());
            if (to != epic.status()) {
                allWritten &= moveByChildren(projectId, epic, to, statusesOf(entry.getValue(), statusOf), actor);
            }
        }
        return allWritten;
    }

    private static List<Status> statusesOf(List<Card> children, Map<UUID, Status> statusOf) {
        return children.stream().map(child -> statusOf.get(child.id())).toList();
    }

    /**
     * The derived move: to the end of the target column, recorded and published like any move, but
     * with no entry or exit contract (no one chose it), no human edit, and a history line that says
     * why. Its summary is not {@link DeliveryFlow#MOVED_TO}'s, so an epic never counts as a delivery.
     */
    private boolean moveByChildren(UUID projectId, Card epic, Status to, List<Status> children, Actor actor) {
        Map<UUID, Integer> sourceOrder = OrderReindexer.reindex(cards.columnOrder(projectId, epic.status()).stream()
                .filter(id -> !id.equals(epic.id())).toList());
        Map<UUID, Integer> destOrder = Map.of(epic.id(), cards.columnOrder(projectId, to).size());
        Instant now = Instant.now(clock);
        if (!cards.moveIfVersion(projectId, epic.id(), epic.version(), to, sourceOrder, destOrder, now, null)) {
            return false;
        }
        Card moved = cards.findById(projectId, epic.id()).orElseThrow();
        long done = children.stream().filter(s -> s == Status.DONE).count();
        activity.record(projectId, moved.id(), moved.key(), actor, "card.moved", "Status follows its children: "
                + to.wire() + " (" + done + " of " + children.size() + " done)", now);
        activity.publish("card.moved", projectId, moved.id(), moved.key(), moved.version(), actor, now);
        reindex.accept(moved);
        return true;
    }
}
