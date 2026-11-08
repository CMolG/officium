package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.ActivityEntry;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.ports.ActivityRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * The one place that appends an {@link ActivityEntry} AND publishes the matching
 * {@link ChangeEvent} (contract §1.5: "every mutation appends an ActivityEntry and publishes a
 * change event after commit"). Every mutating method of {@code ProjectService}/
 * {@code ProjectMembershipService}/{@code CardService}/... calls this once it has committed its
 * write, never before. A write to an existing card is also told to every {@link CardChangeListener}
 * (JAVA-882), after the event.
 */
@ApplicationScoped
public class ActivityPublisher {

    private static final Logger LOG = Logger.getLogger(ActivityPublisher.class.getName());

    private final ActivityRepository activity;
    private final ProjectEventBroadcaster broadcaster;
    private final Iterable<CardChangeListener> listeners;

    @Inject
    public ActivityPublisher(ActivityRepository activity, ProjectEventBroadcaster broadcaster,
            Instance<CardChangeListener> listeners) {
        this(activity, broadcaster, (Iterable<CardChangeListener>) listeners);
    }

    /** With no listener: what Officium's own tests need. */
    public ActivityPublisher(ActivityRepository activity, ProjectEventBroadcaster broadcaster) {
        this(activity, broadcaster, List.of());
    }

    ActivityPublisher(ActivityRepository activity, ProjectEventBroadcaster broadcaster,
            Iterable<CardChangeListener> listeners) {
        this.activity = activity;
        this.broadcaster = broadcaster;
        this.listeners = listeners;
    }

    public void record(UUID projectId, UUID cardId, String cardKey, Actor actor, String operation,
            String summary, Instant at) {
        activity.insert(new ActivityEntry(UUID.randomUUID(), projectId, cardId, cardKey, actor, operation,
                summary, at));
    }

    /** A documentation event: ids and a path, plus a version for a page write (contract §4). */
    public void publishDoc(String type, UUID projectId, String path, Integer version, Actor actor, Instant at) {
        broadcaster.publish(ChangeEvent.ofDoc(type, projectId, path, version, actor, at));
    }

    public void publish(String type, UUID projectId, UUID cardId, String cardKey, Integer version,
            Actor actor, Instant at) {
        broadcaster.publish(ChangeEvent.of(type, projectId, cardId, cardKey, version, actor, at));
        if (cardId == null || !type.startsWith("card.") || "card.created".equals(type)) {
            return;
        }
        CardChangeListener.CardChange change = new CardChangeListener.CardChange(type, projectId, cardId, cardKey,
                version);
        for (CardChangeListener listener : listeners) {
            try {
                listener.cardChanged(change);
            } catch (RuntimeException ex) {
                // The write is committed: a follower's failure is its own, never the writer's.
                LOG.log(Level.WARNING, "A card change listener failed on " + type + " of " + cardKey, ex);
            }
        }
    }
}
