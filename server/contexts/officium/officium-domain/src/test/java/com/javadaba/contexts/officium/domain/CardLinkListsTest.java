package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CardLinkListsTest {

    private static final UUID PROJECT = UUID.randomUUID();
    private final Card c = card("JAVA-3", Status.TODO);
    private final Card a = card("JAVA-1", Status.DONE);
    private final Card b = card("JAVA-2", Status.REVIEW);

    @Test
    void a_finished_blocker_is_related_by_and_an_open_one_still_blocks() {
        List<CardLink> links = List.of(blocks(a, c), blocks(b, c));

        CardLinkLists lists = CardLinkLists.of(c, links, Map.of(a.id(), a.status(), b.id(), b.status()));

        assertThat(lists.blockedBy()).containsExactly("JAVA-2");
        assertThat(lists.relatedBy()).containsExactly(new CardLinkLists.RelatedBy("JAVA-1", "blockedThis"));
        assertThat(lists.blocked()).isTrue();
        assertThat(lists.related()).isEmpty();
    }

    @Test
    void the_blocker_side_reads_the_finished_edge_as_blocked_by_this() {
        CardLinkLists lists = CardLinkLists.of(a, List.of(blocks(a, c)), Map.of());

        assertThat(lists.blocks()).isEmpty();
        assertThat(lists.relatedBy()).containsExactly(new CardLinkLists.RelatedBy("JAVA-3", "blockedByThis"));
    }

    @Test
    void a_blocker_that_reopens_blocks_again_with_the_same_stored_edge() {
        List<CardLink> links = List.of(blocks(a, c));
        Card reopened = card("JAVA-1", Status.TODO);

        assertThat(CardLinkLists.of(c, links, Map.of(a.id(), Status.DONE)).blocked()).isFalse();
        assertThat(CardLinkLists.of(c, links, Map.of(a.id(), reopened.status())).blockedBy())
                .containsExactly("JAVA-1");
        assertThat(CardLinkLists.of(reopened, List.of(blocks(reopened, c)), Map.of()).blocks())
                .containsExactly("JAVA-3");
    }

    // card://JAVA-1415: a discarded blocker is not shipped work, so the link keeps blocking.
    @Test
    void a_rejected_blocker_stays_in_blocked_by() {
        List<CardLink> links = List.of(blocks(a, c));

        CardLinkLists lists = CardLinkLists.of(c, links, Map.of(a.id(), Status.REJECTED));

        assertThat(lists.blockedBy()).containsExactly("JAVA-1");
        assertThat(lists.relatedBy()).isEmpty();
        assertThat(lists.blocked()).isTrue();
    }

    @Test
    void related_links_and_a_missing_blocker_are_handled() {
        CardLink related = new CardLink(UUID.randomUUID(), PROJECT, LinkType.RELATED, c.id(), a.id(), "JAVA-3",
                "JAVA-1");

        CardLinkLists lists = CardLinkLists.of(c, List.of(related, blocks(b, c)), Map.of());

        assertThat(lists.related()).containsExactly("JAVA-1");
        assertThat(lists.blockedBy()).isEmpty();
        assertThat(lists.relatedBy()).isEmpty();
    }

    private static CardLink blocks(Card source, Card target) {
        return new CardLink(UUID.randomUUID(), PROJECT, LinkType.BLOCKS, source.id(), target.id(), source.key(),
                target.key());
    }

    private static Card card(String key, Status status) {
        Instant at = Instant.parse("2026-10-07T10:00:00Z");
        Actor agent = Actor.agent(UUID.randomUUID(), "Agent");
        return new Card(UUID.randomUUID(), PROJECT, key, 1, "Title", null, null, status, RunState.IDLE,
                Priority.MEDIUM, Executor.AI, Category.ENHANCEMENT, 0, 0, null, List.of(), List.of(), 1, at, at,
                agent, agent, null, null, null, null, 0, List.of(), null);
    }
}
