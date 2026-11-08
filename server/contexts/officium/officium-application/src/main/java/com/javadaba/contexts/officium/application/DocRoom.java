package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.application.DocRoomFrames.Out;
import com.javadaba.contexts.officium.domain.Actor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.javadaba.contexts.officium.application.DocRoomFrames.AWARENESS;
import static com.javadaba.contexts.officium.application.DocRoomFrames.SNAPSHOT;
import static com.javadaba.contexts.officium.application.DocRoomFrames.UPDATE;
import static com.javadaba.contexts.officium.application.DocRoomFrames.control;
import static com.javadaba.contexts.officium.application.DocRoomFrames.data;

/**
 * One page's live room (ADR 0024). Pure and in memory: every operation answers the frames to send,
 * so the rules are tested with no socket. The room keeps Yjs updates as opaque bytes.
 */
final class DocRoom {

    static final int MAX_CONNECTIONS = 50;
    static final long COMPACT_AT = 2L << 20;
    static final long MAX_LOG = 8L << 20;

    record Joiner(String id, UUID accountId, String name, boolean editor, long clientId) {
    }

    private record Entry(long seq, int kind, byte[] bytes) {
    }

    private String epoch = UUID.randomUUID().toString();
    private final List<Entry> log = new ArrayList<>();
    private final Map<String, Joiner> connections = new LinkedHashMap<>();
    private final Map<String, byte[]> awareness = new LinkedHashMap<>();
    private final Map<UUID, Actor> coAuthors = new LinkedHashMap<>();
    private long nextSeq = 1;
    private long logBytes;
    private boolean founded;
    private String seeder;
    private String saver;
    private boolean compactAsked;
    private Instant emptySince;

    String epoch() {
        return epoch;
    }

    int size() {
        return connections.size();
    }

    Instant emptySince() {
        return emptySince;
    }

    boolean has(String id) {
        return connections.containsKey(id);
    }

    List<Actor> coAuthors() {
        return List.copyOf(coAuthors.values());
    }

    void clearCoAuthors() {
        coAuthors.clear();
    }

    /**
     * A client names the epoch whose state it holds. The same epoch pushes its state again, an
     * unfounded room is re-founded on it, and any other epoch is stale: pushing there would double
     * the page.
     */
    List<Out> join(Joiner who, String clientEpoch, boolean hasState) {
        List<Out> out = new ArrayList<>();
        boolean push = false;
        if (clientEpoch != null && !clientEpoch.equals(epoch)) {
            if (founded || !log.isEmpty() || !hasState || !who.editor()) {
                out.add(control(who.id(), "stale", "close", true));
                return out;
            }
            epoch = clientEpoch;
            founded = true;
            push = true;
        } else if (clientEpoch != null) {
            push = hasState && who.editor();
        }
        connections.put(who.id(), who);
        emptySince = null;
        boolean seed = !founded && seeder == null && who.editor();
        if (seed) {
            seeder = who.id();
        }
        electSaver(out, who.id());
        out.add(control(who.id(), "welcome", "epoch", epoch, "seq", nextSeq - 1, "founded", founded, "seed", seed,
                "push", push, "saver", who.id().equals(saver), "editor", who.editor()));
        for (Entry e : log) {
            out.add(data(who.id(), e.kind, e.seq, e.bytes));
        }
        awareness.forEach((id, bytes) -> out.add(data(who.id(), AWARENESS, 0, bytes)));
        return out;
    }

    List<Out> leave(String id, Instant now) {
        Joiner gone = connections.remove(id);
        if (gone == null) {
            return List.of();
        }
        awareness.remove(id);
        List<Out> out = new ArrayList<>();
        broadcast(out, id, control(null, "left", "clientId", gone.clientId()));
        if (id.equals(seeder)) {
            seeder = null;
            connections.values().stream().filter(Joiner::editor).findFirst().ifPresent(next -> {
                seeder = next.id();
                out.add(control(next.id(), "seed"));
            });
        }
        electSaver(out, null);
        if (connections.isEmpty()) {
            emptySince = now;
        }
        return out;
    }

    /** The seed holder declares the room seeded without an update, because the page was empty. */
    List<Out> seeded(String id) {
        return id.equals(seeder) ? found() : List.of();
    }

    /**
     * A merge notice or an outside write (JAVA-1477), forwarded untouched: {@code merged} comes from the
     * saver and goes to everyone else, {@code outside} comes from an editor and goes to the saver.
     */
    List<Out> relay(String id, String type, Map<String, Object> fields) {
        Joiner who = connections.get(id);
        if (who == null || !who.editor() || saver == null) {
            return List.of();
        }
        Map<String, Object> frame = new LinkedHashMap<>();
        frame.put("type", type);
        frame.putAll(fields);
        List<Out> out = new ArrayList<>();
        if ("merged".equals(type) && id.equals(saver)) {
            broadcast(out, id, new Out(null, frame, null));
        } else if ("outside".equals(type) && !id.equals(saver)) {
            out.add(new Out(saver, frame, null));
        }
        return out;
    }

    List<Out> update(String id, byte[] bytes) {
        Joiner who = connections.get(id);
        if (who == null) {
            return List.of();
        }
        if (!who.editor()) {
            return List.of(control(id, "error", "code", "read_only"));
        }
        if (!founded && !id.equals(seeder)) {
            return List.of(control(id, "error", "code", "not_seeded"));
        }
        if (logBytes + bytes.length > MAX_LOG) {
            return List.of(control(id, "error", "code", "room_full"));
        }
        List<Out> out = new ArrayList<>(founded ? List.of() : found());
        long seq = nextSeq++;
        log.add(new Entry(seq, UPDATE, bytes));
        logBytes += bytes.length;
        coAuthors.putIfAbsent(who.accountId(), Actor.person(who.accountId(), who.name()));
        broadcast(out, id, data(null, UPDATE, seq, bytes));
        out.add(control(id, "ack", "seq", seq));
        if (logBytes > COMPACT_AT && !compactAsked && saver != null) {
            compactAsked = true;
            out.add(control(saver, "compact"));
        }
        return out;
    }

    /** The saver's snapshot replaces every entry up to {@code upTo}. */
    List<Out> snapshot(String id, long upTo, byte[] bytes) {
        if (!id.equals(saver) || upTo >= nextSeq || upTo < 1) {
            return List.of();
        }
        log.removeIf(e -> e.seq <= upTo);
        log.add(0, new Entry(upTo, SNAPSHOT, bytes));
        logBytes = log.stream().mapToLong(e -> e.bytes.length).sum();
        compactAsked = false;
        return List.of();
    }

    List<Out> awareness(String id, byte[] bytes) {
        if (!connections.containsKey(id)) {
            return List.of();
        }
        awareness.put(id, bytes);
        List<Out> out = new ArrayList<>();
        broadcast(out, id, data(null, AWARENESS, 0, bytes));
        return out;
    }

    /** Tells everyone the room is moving; the socket closes with 1012. */
    List<Out> drain() {
        List<Out> out = new ArrayList<>();
        connections.keySet().forEach(id -> out.add(control(id, "moving", "close", true)));
        return out;
    }

    private List<Out> found() {
        founded = true;
        seeder = null;
        List<Out> out = new ArrayList<>();
        connections.keySet().forEach(id -> out.add(control(id, "founded")));
        return out;
    }

    /** The oldest editor saves. A change is told to the new saver (unless it is the joiner) and the old one. */
    private void electSaver(List<Out> out, String joiner) {
        String elected = connections.values().stream().filter(Joiner::editor).map(Joiner::id).findFirst()
                .orElse(null);
        if (java.util.Objects.equals(elected, saver)) {
            return;
        }
        if (saver != null && connections.containsKey(saver)) {
            out.add(control(saver, "saver", "on", false));
        }
        if (elected != null && !elected.equals(joiner)) {
            out.add(control(elected, "saver", "on", true));
        }
        saver = elected;
    }

    private void broadcast(List<Out> out, String from, Out template) {
        for (String id : connections.keySet()) {
            if (!id.equals(from)) {
                out.add(new Out(id, template.control(), template.data()));
            }
        }
    }
}
