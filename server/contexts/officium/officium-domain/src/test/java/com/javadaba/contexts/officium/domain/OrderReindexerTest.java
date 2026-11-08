package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class OrderReindexerTest {

    @Test
    void inserting_into_an_empty_column_gives_order_zero() {
        UUID card = UUID.randomUUID();
        Map<UUID, Integer> result = OrderReindexer.reindexWithInsertion(List.of(), card, 0);
        assertThat(result).containsEntry(card, 0);
    }

    @Test
    void order_stays_dense_after_inserting_in_the_middle() {
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        UUID c = UUID.randomUUID();
        Map<UUID, Integer> result = OrderReindexer.reindexWithInsertion(List.of(a, b), c, 1);
        assertThat(result).containsExactlyInAnyOrderEntriesOf(Map.of(a, 0, c, 1, b, 2));
    }

    @Test
    void a_position_beyond_the_end_is_clamped_to_the_end() {
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        Map<UUID, Integer> result = OrderReindexer.reindexWithInsertion(List.of(a), b, 99);
        assertThat(result).containsExactlyInAnyOrderEntriesOf(Map.of(a, 0, b, 1));
    }

    @Test
    void a_negative_position_is_clamped_to_zero() {
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        Map<UUID, Integer> result = OrderReindexer.reindexWithInsertion(List.of(a), b, -5);
        assertThat(result).containsExactlyInAnyOrderEntriesOf(Map.of(b, 0, a, 1));
    }

    @Test
    void reindex_without_insertion_closes_the_gap_left_by_a_removal() {
        UUID a = UUID.randomUUID();
        UUID c = UUID.randomUUID();
        Map<UUID, Integer> result = OrderReindexer.reindex(List.of(a, c));
        assertThat(result).containsExactlyInAnyOrderEntriesOf(Map.of(a, 0, c, 1));
    }
}
