package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Turns a page's comment rows into the threads the contract serves (JAVA-797, contract §8). */
public final class DocCommentThreads {

    private DocCommentThreads() {
    }

    public record Reactor(UUID accountId, String name) {
    }

    public record ReactionGroup(String emoji, List<Reactor> by) {
    }

    public record Entry(UUID id, Actor author, String text, Instant createdAt, Instant updatedAt, boolean deleted,
            List<ReactionGroup> reactions) {
    }

    /** {@code quote} is {@code null} on a page-level thread; {@code detached} only means anything when it isn't. */
    public record Thread(UUID id, String path, String pageTitle, DocQuote quote, boolean detached, Instant resolvedAt,
            Actor resolvedBy, List<Entry> comments) {

        public Instant lastActivityAt() {
            Instant last = resolvedAt == null ? Instant.EPOCH : resolvedAt;
            for (Entry entry : comments) {
                last = entry.updatedAt().isAfter(last) ? entry.updatedAt() : last;
            }
            return last;
        }
    }

    /**
     * Oldest root first, replies oldest first. A deleted root keeps its place with its text and reactions
     * dropped when replies remain, and disappears with its last reply.
     */
    public static List<Thread> build(DocPage page, List<DocComment> rows, List<DocCommentReaction> reactions) {
        Map<UUID, List<DocCommentReaction>> reacted = reactions.stream()
                .collect(Collectors.groupingBy(DocCommentReaction::commentId));
        Map<UUID, List<DocComment>> replies = new LinkedHashMap<>();
        rows.stream().filter(c -> !c.isRoot()).sorted(Comparator.comparing(DocComment::createdAt))
                .forEach(c -> replies.computeIfAbsent(c.parentId(), k -> new ArrayList<>()).add(c));
        List<Thread> threads = new ArrayList<>();
        rows.stream().filter(DocComment::isRoot).sorted(Comparator.comparing(DocComment::createdAt)).forEach(root -> {
            List<DocComment> mine = replies.getOrDefault(root.id(), List.of());
            if (root.deleted() && mine.isEmpty()) {
                return;
            }
            List<Entry> entries = new ArrayList<>();
            entries.add(entry(root, reacted));
            mine.forEach(reply -> entries.add(entry(reply, reacted)));
            threads.add(new Thread(root.id(), page.path(), page.title(), root.quote(),
                    root.quote() != null && DocQuoteMatch.detached(page.body(), root.quote()), root.resolvedAt(),
                    root.resolvedBy(), entries));
        });
        return threads;
    }

    private static Entry entry(DocComment comment, Map<UUID, List<DocCommentReaction>> reacted) {
        if (comment.deleted()) {
            return new Entry(comment.id(), comment.author(), "", comment.createdAt(), comment.updatedAt(), true,
                    List.of());
        }
        Map<String, List<Reactor>> byEmoji = new LinkedHashMap<>();
        reacted.getOrDefault(comment.id(), List.of()).stream().sorted(Comparator.comparing(DocCommentReaction::at))
                .forEach(r -> byEmoji.computeIfAbsent(r.emoji(), k -> new ArrayList<>())
                        .add(new Reactor(r.accountId(), r.name())));
        List<ReactionGroup> groups = byEmoji.entrySet().stream()
                .map(e -> new ReactionGroup(e.getKey(), e.getValue())).toList();
        return new Entry(comment.id(), comment.author(), comment.text(), comment.createdAt(), comment.updatedAt(),
                false, groups);
    }
}
