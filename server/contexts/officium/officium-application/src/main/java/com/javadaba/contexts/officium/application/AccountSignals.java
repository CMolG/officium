package com.javadaba.contexts.officium.application;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * In-process pub/sub keyed by ACCOUNT (JAVA-1145): what is for one person, whatever the project, such
 * as a summons. Project rooms ({@link ProjectEventBroadcaster}) stay untouched, or every board would
 * refetch on it. Single instance, with the same caveat as the project rooms.
 */
@ApplicationScoped
public class AccountSignals {

    /** Ids only: the web refetches the summons itself. {@code state}: round, snoozed or closed. */
    public record SummonsSignal(String summonsId, UUID projectId, int round, String state) {
    }

    private final Map<UUID, List<Consumer<SummonsSignal>>> rooms = new ConcurrentHashMap<>();

    public AutoCloseable subscribe(UUID accountId, Consumer<SummonsSignal> listener) {
        List<Consumer<SummonsSignal>> room = rooms.computeIfAbsent(accountId, key -> new CopyOnWriteArrayList<>());
        room.add(listener);
        return () -> room.remove(listener);
    }

    public void publish(UUID accountId, SummonsSignal signal) {
        List<Consumer<SummonsSignal>> room = rooms.get(accountId);
        if (room != null) {
            room.forEach(listener -> listener.accept(signal));
        }
    }
}
