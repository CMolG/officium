package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Cards and blocks edges for the epic execution tests (card://JAVA-1868), one project, written in board terms. */
final class EpicFixtures {

    static final UUID PROJECT = UUID.fromString("00000000-0000-0000-0000-000000001868");
    private static final Instant T0 = Instant.parse("2026-10-26T00:00:00Z");

    private EpicFixtures() {
    }

    /** A builder over one card, so each test names only what it is about. */
    record Spec(String key, Category category, Status status, String epic, Executor executor, List<String> tags,
            int rank, UUID sprintId, List<Signal> signals, CardWorkflow workflow) {

        Spec status(Status value) {
            return new Spec(key, category, value, epic, executor, tags, rank, sprintId, signals, workflow);
        }

        Spec category(Category value) {
            return new Spec(key, value, status, epic, executor, tags, rank, sprintId, signals, workflow);
        }

        Spec human() {
            return new Spec(key, category, status, epic, Executor.HUMAN, tags, rank, sprintId, signals, workflow);
        }

        Spec tags(String... value) {
            return new Spec(key, category, status, epic, executor, List.of(value), rank, sprintId, signals, workflow);
        }

        Spec rank(int value) {
            return new Spec(key, category, status, epic, executor, tags, value, sprintId, signals, workflow);
        }

        Spec signals(Signal... value) {
            return new Spec(key, category, status, epic, executor, tags, rank, sprintId, List.of(value), workflow);
        }

        Spec workflow(CardWorkflow value) {
            return new Spec(key, category, status, epic, executor, tags, rank, sprintId, signals, value);
        }

        Card card() {
            UUID id = UUID.nameUUIDFromBytes(key.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return new Card(id, PROJECT, key, Integer.parseInt(key.substring(key.indexOf('-') + 1)), "Title " + key,
                    null, null, status, RunState.IDLE, Priority.MEDIUM, executor, category, 0, 0, epic, tags,
                    executor == Executor.HUMAN ? List.of(new Assignee(UUID.randomUUID(), "Owner")) : List.of(), 1,
                    T0, T0, null, null, null, null, null, sprintId, rank, signals, null, null, workflow);
        }
    }

    static Spec epic(String key) {
        return new Spec(key, Category.EPIC, Status.TODO, null, Executor.AI, List.of(), 0, null, List.of(), null);
    }

    /** A feature in To do that belongs to {@code epic}. */
    static Spec child(String key, String epic) {
        return new Spec(key, Category.FEATURE, Status.TODO, epic, Executor.AI, List.of(), 0, null, List.of(), null);
    }

    static Card standalone(String key) {
        return child(key, null).card();
    }

    static CardLink blocks(Card source, Card target) {
        return new CardLink(UUID.randomUUID(), PROJECT, LinkType.BLOCKS, source.id(), target.id(), source.key(),
                target.key());
    }
}
