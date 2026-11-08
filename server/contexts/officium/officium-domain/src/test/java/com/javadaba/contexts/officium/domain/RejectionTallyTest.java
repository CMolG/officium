package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1415: the period's rejected cards, by reason and by category. */
class RejectionTallyTest {

    private static final UUID PROJECT = UUID.randomUUID();
    private static final Instant START = Instant.parse("2026-10-01T00:00:00Z");
    private static final Instant END = Instant.parse("2026-10-15T00:00:00Z");
    private static final Instant INSIDE = Instant.parse("2026-10-10T12:00:00Z");

    @Test
    void countsTheRejectedCardsByReasonAndCategoryMostFirst() {
        Card a = rejected(RejectionReason.DUPLICATE, Category.BUG);
        Card b = rejected(RejectionReason.DUPLICATE, Category.FEATURE);
        Card c = rejected(RejectionReason.NOT_NEEDED, Category.FEATURE);
        Card d = rejected(RejectionReason.OTHER, null);

        RejectionTally tally = RejectionTally.of(List.of(a, b, c, d),
                Map.of(a.id(), INSIDE, b.id(), INSIDE, c.id(), INSIDE, d.id(), INSIDE), START, END);

        assertThat(tally.total()).isEqualTo(4);
        assertThat(tally.byReason()).containsExactly(new RejectionTally.ByReason(RejectionReason.DUPLICATE, 2),
                new RejectionTally.ByReason(RejectionReason.NOT_NEEDED, 1),
                new RejectionTally.ByReason(RejectionReason.OTHER, 1));
        assertThat(tally.byCategory()).containsExactly(new RejectionTally.ByCategory(Category.FEATURE, 2),
                new RejectionTally.ByCategory(Category.BUG, 1), new RejectionTally.ByCategory(null, 1));
    }

    @Test
    void onlyARejectionWhoseLastMoveFallsInThePeriodCounts() {
        Card before = rejected(RejectionReason.OTHER, Category.BUG);
        Card atStart = rejected(RejectionReason.OTHER, Category.BUG);
        Card atEnd = rejected(RejectionReason.OTHER, Category.BUG);

        RejectionTally tally = RejectionTally.of(List.of(before, atStart, atEnd), Map.of(
                before.id(), START.minusSeconds(1), atStart.id(), START, atEnd.id(), END), START, END);

        assertThat(tally.total()).isEqualTo(1);
    }

    @Test
    void aCardThatIsNotRejectedNowIsNotCounted() {
        Card open = card(Status.REFINE, null, Category.BUG);

        assertThat(RejectionTally.of(List.of(open), Map.of(open.id(), INSIDE), START, END).total()).isZero();
    }

    private static Card rejected(RejectionReason reason, Category category) {
        return card(Status.REJECTED, new CardRejection(reason, "What was wrong", null), category);
    }

    private static Card card(Status status, CardRejection rejection, Category category) {
        Instant at = Instant.parse("2026-09-01T10:00:00Z");
        Actor agent = Actor.agent(UUID.randomUUID(), "Agent");
        return new Card(UUID.randomUUID(), PROJECT, "JAVA-1", 1, "Title", null, null, status, RunState.IDLE,
                Priority.MEDIUM, Executor.AI, category, 0, 0, null, List.of(), List.of(), 1, at, at,
                agent, agent, null, null, null, null, 0, List.of(), null, rejection);
    }
}
