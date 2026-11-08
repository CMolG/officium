package com.javadaba.contexts.officium.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DocCommentThreadsTest {

    private static final Instant T0 = Instant.parse("2026-10-13T10:00:00Z");
    private final Actor ana = Actor.person(UUID.randomUUID(), "Ana");
    private final Actor ben = Actor.person(UUID.randomUUID(), "Ben");
    private final DocPage page = DocPage.created(UUID.randomUUID(), "guides/start", "Start", "Hello brave world",
            ana, T0);

    @Test
    void repliesFollowTheirRootAndAQuoteThatLeftTheBodyIsDetached() {
        DocComment root = DocComment.root(page.id(), ana, "Why?", DocQuote.of("brave world"), T0);
        DocComment gone = DocComment.root(page.id(), ana, "Gone", DocQuote.of("vanished words"), T0.plusSeconds(1));
        DocComment reply = DocComment.reply(root, ben, "Because.", T0.plusSeconds(2));
        List<DocCommentThreads.Thread> threads = DocCommentThreads.build(page, List.of(reply, gone, root), List.of());
        assertEquals(2, threads.size());
        assertEquals(List.of("Why?", "Because."),
                threads.get(0).comments().stream().map(DocCommentThreads.Entry::text).toList());
        assertFalse(threads.get(0).detached());
        assertTrue(threads.get(1).detached());
        assertEquals("guides/start", threads.get(1).path());
    }

    @Test
    void aDeletedRootWithRepliesIsATombstoneAndWithoutThemItIsGone() {
        DocComment root = DocComment.root(page.id(), ana, "Secret", DocQuote.of("Hello"), T0);
        DocComment reply = DocComment.reply(root, ben, "Mine", T0.plusSeconds(1));
        var reaction = new DocCommentReaction(root.id(), "👍", ben.accountId(), "Ben", T0);
        var kept = DocCommentThreads.build(page, List.of(root.tombstone(T0.plusSeconds(2)), reply), List.of(reaction));
        var first = kept.get(0).comments().get(0);
        assertTrue(first.deleted());
        assertEquals("", first.text());
        assertTrue(first.reactions().isEmpty());
        assertEquals("Hello", kept.get(0).quote().exact());
        assertTrue(DocCommentThreads.build(page, List.of(root.tombstone(T0)), List.of()).isEmpty());
    }

    @Test
    void reactionsGroupByEmojiAndNameWhoReacted() {
        DocComment root = DocComment.root(page.id(), ana, "Nice", null, T0);
        var a = new DocCommentReaction(root.id(), "👍", ana.accountId(), "Ana", T0);
        var b = new DocCommentReaction(root.id(), "👍", ben.accountId(), "Ben", T0.plusSeconds(1));
        var c = new DocCommentReaction(root.id(), "🎉", ben.accountId(), "Ben", T0.plusSeconds(2));
        var groups = DocCommentThreads.build(page, List.of(root), List.of(b, c, a)).get(0).comments().get(0)
                .reactions();
        assertEquals(List.of("👍", "🎉"), groups.stream().map(DocCommentThreads.ReactionGroup::emoji).toList());
        assertEquals(List.of("Ana", "Ben"), groups.get(0).by().stream().map(DocCommentThreads.Reactor::name).toList());
    }

    @Test
    void permissionsAndShapeRules() {
        DocComment root = DocComment.root(page.id(), ana, " Hi ", null, T0);
        assertEquals("Hi", root.text());
        assertTrue(root.editableBy(ana.accountId()));
        assertFalse(root.editableBy(ben.accountId()));
        assertTrue(root.deletableBy(ben.accountId(), true));
        assertFalse(root.deletableBy(ben.accountId(), false));
        DocComment reply = DocComment.reply(root, ben, "Yo", T0);
        assertEquals(root.id(), reply.parentId());
        assertThrows(OfficiumException.class, () -> DocComment.reply(reply, ana, "Nested", T0));
        assertThrows(OfficiumException.class, () -> DocComment.root(page.id(), ana, "  ", null, T0));
        assertTrue(root.resolvedBy(ben, T0).resolved());
        assertFalse(root.resolvedBy(ben, T0).reopened().resolved());
        assertThrows(OfficiumException.class,
                () -> new DocCommentReaction(root.id(), "no", ana.accountId(), "Ana", T0));
    }
}
