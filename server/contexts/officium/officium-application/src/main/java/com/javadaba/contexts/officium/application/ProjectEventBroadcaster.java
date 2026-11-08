package com.javadaba.contexts.officium.application;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * In-process, room-per-project pub/sub for the live channel (JDB-217), same shape as fluxor's
 * {@code RelayBroadcaster}: "the REST persists, the broadcaster diffuses". Single-instance state
 * -- a subscriber only sees events published on the SAME app-api process, the same caveat as
 * {@code /fluxor/v1/relay} (contract §4: "the bus is in-process today, single instance").
 */
@ApplicationScoped
public class ProjectEventBroadcaster {

    private final Map<UUID, List<Consumer<ChangeEvent>>> rooms = new ConcurrentHashMap<>();

    public AutoCloseable subscribe(UUID projectId, Consumer<ChangeEvent> listener) {
        List<Consumer<ChangeEvent>> room = rooms.computeIfAbsent(projectId, key -> new CopyOnWriteArrayList<>());
        room.add(listener);
        return () -> room.remove(listener);
    }

    /** Called ONLY after the write's transaction has committed (contract §1.5). */
    public void publish(ChangeEvent event) {
        List<Consumer<ChangeEvent>> room = rooms.get(event.projectId());
        if (room == null || room.isEmpty()) {
            return;
        }
        for (Consumer<ChangeEvent> listener : room) {
            listener.accept(event);
        }
    }

    /** Connected listeners for a project -- lets a test wait for a real subscription instead of
     *  an arbitrary sleep (same pattern as fluxor's {@code RelayBroadcaster#subscriberCount}). */
    public int subscriberCount(UUID projectId) {
        List<Consumer<ChangeEvent>> room = rooms.get(projectId);
        return room == null ? 0 : room.size();
    }
}
