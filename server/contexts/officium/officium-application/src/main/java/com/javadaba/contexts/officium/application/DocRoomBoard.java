package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.application.DocRoom.Joiner;
import com.javadaba.contexts.officium.application.DocRoomFrames.Out;
import com.javadaba.contexts.officium.domain.Actor;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.javadaba.contexts.officium.application.DocRoomFrames.control;

/**
 * The documentation rooms of one app-api instance (JAVA-803, ADR 0024), keyed (project, page id).
 * In memory like {@link DocPresenceBoard}: a restart blanks it, and clients re-found their room on
 * their epoch. Every operation answers the frames to send; the socket only delivers them.
 */
public final class DocRoomBoard {

    static final int MAX_ROOMS = 200;
    static final Duration GRACE = Duration.ofSeconds(60);

    private record Key(UUID projectId, UUID pageId) {
    }

    private final Map<Key, DocRoom> rooms = new HashMap<>();
    private final Map<String, Key> byConnection = new HashMap<>();
    private final Clock clock;

    public DocRoomBoard(Clock clock) {
        this.clock = clock;
    }

    /**
     * @param clientEpoch the epoch whose state the client holds, or null when it holds none
     * @param hasState whether the client holds unsaved room state to push
     */
    public synchronized List<Out> join(UUID projectId, UUID pageId, String connection, UUID accountId,
            String name, boolean editor, long clientId, String clientEpoch, boolean hasState) {
        sweep();
        Key key = new Key(projectId, pageId);
        DocRoom room = rooms.get(key);
        if (room == null && rooms.size() >= MAX_ROOMS) {
            return List.of(control(connection, "refused", "code", "too_many_rooms", "close", true));
        }
        if (room != null && room.size() >= DocRoom.MAX_CONNECTIONS) {
            return List.of(control(connection, "refused", "code", "room_full", "close", true));
        }
        if (room == null) {
            room = new DocRoom();
        }
        List<Out> out = room.join(new Joiner(connection, accountId, name, editor, clientId), clientEpoch, hasState);
        if (room.has(connection)) {
            rooms.put(key, room);
            byConnection.put(connection, key);
        }
        return out;
    }

    public synchronized List<Out> leave(String connection) {
        Key key = byConnection.remove(connection);
        DocRoom room = key == null ? null : rooms.get(key);
        return room == null ? List.of() : room.leave(connection, Instant.now(clock));
    }

    public synchronized List<Out> update(String connection, byte[] bytes) {
        return with(connection, room -> room.update(connection, bytes));
    }

    public synchronized List<Out> snapshot(String connection, long upTo, byte[] bytes) {
        return with(connection, room -> room.snapshot(connection, upTo, bytes));
    }

    public synchronized List<Out> awareness(String connection, byte[] bytes) {
        return with(connection, room -> room.awareness(connection, bytes));
    }

    public synchronized List<Out> relay(String connection, String type, Map<String, Object> fields) {
        return with(connection, room -> room.relay(connection, type, fields));
    }

    public synchronized List<Out> seeded(String connection) {
        return with(connection, room -> room.seeded(connection));
    }

    /**
     * The people who sent updates since the last save, when {@code epoch} is a live room's epoch of this
     * project (JAVA-803 attribution): from the server's own connections, never from the request.
     */
    public synchronized List<Actor> coAuthors(UUID projectId, String epoch) {
        return roomOf(projectId, epoch).map(DocRoom::coAuthors).orElse(List.of());
    }

    /** Forgets the co-authors a save has now recorded. */
    public synchronized void saved(UUID projectId, String epoch) {
        roomOf(projectId, epoch).ifPresent(DocRoom::clearCoAuthors);
    }

    private Optional<DocRoom> roomOf(UUID projectId, String epoch) {
        return rooms.entrySet().stream().filter(e -> e.getKey().projectId().equals(projectId))
                .map(Map.Entry::getValue).filter(room -> room.epoch().equals(epoch)).findFirst();
    }

    /** Shutdown: every room tells its clients it is moving, and they reconnect and re-found it. */
    public synchronized List<Out> drain() {
        List<Out> out = new ArrayList<>();
        rooms.values().forEach(room -> out.addAll(room.drain()));
        return out;
    }

    public synchronized int rooms() {
        sweep();
        return rooms.size();
    }

    private List<Out> with(String connection, java.util.function.Function<DocRoom, List<Out>> operation) {
        Key key = byConnection.get(connection);
        DocRoom room = key == null ? null : rooms.get(key);
        return room == null ? List.of() : operation.apply(room);
    }

    private void sweep() {
        Instant now = Instant.now(clock);
        rooms.values().removeIf(room -> room.emptySince() != null && !room.emptySince().plus(GRACE).isAfter(now));
    }
}
