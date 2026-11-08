package com.javadaba.contexts.officium.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Who has a documentation page open right now (JAVA-802, contract §8.19). <strong>Monitoring, not
 * record</strong>: nothing here reaches the database or the page's version, and it has the same
 * single-instance, in-process caveat as {@link AgentWorkBoard} -- a restart blanks it, and clients
 * beat again within a beat or on {@code stream.ready}.
 *
 * <p>Keyed by (project, path, client): a client is one open page of one tab. An entry expires
 * {@link #TTL} after its last beat, lazily at read time, so a tab that died without a word drops
 * out without anyone calling "leave". The caps are bounded memory, not a policy: the oldest entry
 * goes first.
 */
public final class DocPresenceBoard {

    static final Duration TTL = Duration.ofSeconds(30);
    static final int MAX_CLIENTS_PER_ACCOUNT = 20;
    static final int MAX_ENTRIES_PER_PROJECT = 500;

    private final Map<UUID, Map<Key, Entry>> byProject = new HashMap<>();
    private final Clock clock;

    public DocPresenceBoard(Clock clock) {
        this.clock = clock;
    }

    /** One person on a page: their two tabs are one entry, and editing wins over viewing. */
    public record Present(UUID accountId, String name, String state, Instant since, long expiresInSeconds) {
    }

    /**
     * Renews the entry, or adds it. {@code name} is asked only for a new entry.
     * @return whether someone arrived or changed state, the only beats worth telling the others.
     */
    public synchronized boolean beat(UUID projectId, String path, UUID client, UUID accountId, String state,
            Supplier<String> name) {
        Instant now = Instant.now(clock);
        Map<Key, Entry> entries = live(projectId, now);
        Key key = new Key(path, client);
        Entry entry = entries.get(key);
        if (entry != null && entry.accountId.equals(accountId)) {
            boolean changed = !entry.state.equals(state);
            entry.state = state;
            entry.lastBeat = now;
            return changed;
        }
        entries.put(key, new Entry(accountId, name.get(), state, now));
        makeRoom(entries, accountId);
        byProject.put(projectId, entries);
        return true;
    }

    /** @return whether that account's entry was there to remove. */
    public synchronized boolean leave(UUID projectId, String path, UUID client, UUID accountId) {
        Map<Key, Entry> entries = live(projectId, Instant.now(clock));
        Key key = new Key(path, client);
        Entry entry = entries.get(key);
        if (entry == null || !entry.accountId.equals(accountId)) {
            return false;
        }
        entries.remove(key);
        if (entries.isEmpty()) {
            byProject.remove(projectId);
        }
        return true;
    }

    /** The people on {@code path}, longest-present first. */
    public synchronized List<Present> present(UUID projectId, String path) {
        Instant now = Instant.now(clock);
        Map<UUID, Present> people = new LinkedHashMap<>();
        live(projectId, now).entrySet().stream()
                .filter(e -> e.getKey().path.equals(path))
                .sorted(Comparator.comparing(e -> e.getValue().since))
                .forEach(e -> people.merge(e.getValue().accountId, present(e.getValue(), now),
                        DocPresenceBoard::merged));
        return new ArrayList<>(people.values());
    }

    private static Present present(Entry entry, Instant now) {
        long left = Duration.between(now, entry.lastBeat.plus(TTL)).toSeconds();
        return new Present(entry.accountId, entry.name, entry.state, entry.since, Math.max(left, 0));
    }

    private static Present merged(Present first, Present second) {
        String state = "editing".equals(first.state) || "editing".equals(second.state) ? "editing" : "viewing";
        long expires = Math.max(first.expiresInSeconds, second.expiresInSeconds);
        return new Present(first.accountId, first.name, state, first.since, expires);
    }

    private void makeRoom(Map<Key, Entry> entries, UUID accountId) {
        while (entries.values().stream().filter(e -> e.accountId.equals(accountId)).count() > MAX_CLIENTS_PER_ACCOUNT) {
            evictOldest(entries, e -> e.accountId.equals(accountId));
        }
        while (entries.size() > MAX_ENTRIES_PER_PROJECT) {
            evictOldest(entries, e -> true);
        }
    }

    private static void evictOldest(Map<Key, Entry> entries, java.util.function.Predicate<Entry> among) {
        entries.entrySet().stream().filter(e -> among.test(e.getValue()))
                .min(Comparator.comparing(e -> e.getValue().lastBeat))
                .ifPresent(e -> entries.remove(e.getKey()));
    }

    /** The project's entries with the expired ones already dropped. */
    private Map<Key, Entry> live(UUID projectId, Instant now) {
        Map<Key, Entry> entries = byProject.get(projectId);
        if (entries == null) {
            return new HashMap<>();
        }
        entries.values().removeIf(e -> !e.lastBeat.plus(TTL).isAfter(now));
        if (entries.isEmpty()) {
            byProject.remove(projectId);
        }
        return entries;
    }

    private record Key(String path, UUID client) {
    }

    private static final class Entry {
        private final UUID accountId;
        private final String name;
        private final Instant since;
        private String state;
        private Instant lastBeat;

        private Entry(UUID accountId, String name, String state, Instant now) {
            this.accountId = accountId;
            this.name = name;
            this.state = state;
            this.since = now;
            this.lastBeat = now;
        }
    }
}
