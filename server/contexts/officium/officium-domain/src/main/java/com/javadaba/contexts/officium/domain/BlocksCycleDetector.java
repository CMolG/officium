package com.javadaba.contexts.officium.domain;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Rejects a {@code blocks} edge that would close a cycle (contract §2, {@code blocks_cycle}).
 * Pure BFS over the project's existing {@code blocks} edges: adding {@code source -> target}
 * closes a cycle exactly when {@code target} can already reach {@code source}.
 */
public final class BlocksCycleDetector {

    private BlocksCycleDetector() {
    }

    public static boolean wouldCreateCycle(List<CardLink> existingBlocksEdges, UUID source, UUID target) {
        if (source.equals(target)) {
            return true;
        }
        Map<UUID, List<UUID>> adjacency = new HashMap<>();
        for (CardLink link : existingBlocksEdges) {
            if (link.type() == LinkType.BLOCKS) {
                adjacency.computeIfAbsent(link.sourceCardId(), k -> new java.util.ArrayList<>())
                        .add(link.targetCardId());
            }
        }
        Set<UUID> visited = new HashSet<>();
        Deque<UUID> queue = new ArrayDeque<>();
        queue.add(target);
        visited.add(target);
        while (!queue.isEmpty()) {
            UUID current = queue.poll();
            if (current.equals(source)) {
                return true;
            }
            for (UUID next : adjacency.getOrDefault(current, List.of())) {
                if (visited.add(next)) {
                    queue.add(next);
                }
            }
        }
        return false;
    }
}
