package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class BlocksCycleDetectorTest {

    private final UUID projectId = UUID.randomUUID();
    private final UUID a = UUID.randomUUID();
    private final UUID b = UUID.randomUUID();
    private final UUID c = UUID.randomUUID();

    private CardLink blocks(UUID from, UUID to) {
        return new CardLink(UUID.randomUUID(), projectId, LinkType.BLOCKS, from, to, null, null);
    }

    @Test
    void a_direct_reverse_edge_is_a_cycle() {
        // a already blocks b; adding "b blocks a" would close a 2-cycle.
        assertThat(BlocksCycleDetector.wouldCreateCycle(List.of(blocks(a, b)), b, a)).isTrue();
    }

    @Test
    void a_transitive_reverse_path_is_a_cycle() {
        // a blocks b blocks c; adding "c blocks a" closes the loop.
        assertThat(BlocksCycleDetector.wouldCreateCycle(List.of(blocks(a, b), blocks(b, c)), c, a)).isTrue();
    }

    @Test
    void an_unrelated_edge_is_not_a_cycle() {
        assertThat(BlocksCycleDetector.wouldCreateCycle(List.of(blocks(a, b)), a, c)).isFalse();
    }

    @Test
    void a_card_cannot_block_itself() {
        assertThat(BlocksCycleDetector.wouldCreateCycle(List.of(), a, a)).isTrue();
    }

    @Test
    void no_existing_edges_never_cycles() {
        assertThat(BlocksCycleDetector.wouldCreateCycle(List.of(), a, b)).isFalse();
    }
}
