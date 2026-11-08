package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Keeps {@code order} dense ({@code 0..n-1}) per {@code (project, status)} column (contract §2).
 * Pure: takes the column's current order (without the moving card) and the target position,
 * returns the full column -> order assignment, moving card included. {@code CardService} applies
 * this to both the source and the destination column on every move (JDB-214/JDB-216).
 */
public final class OrderReindexer {

    private OrderReindexer() {
    }

    /**
     * @param columnWithoutMoving the column's cards, in their current relative order, EXCLUDING
     *                            the card being moved (or inserted for the first time)
     * @param movingCardId        the card to (re)insert
     * @param position            0-based target index, clamped into range
     * @return dense {@code 0..n-1} order for every card in the resulting column, moving card
     *         included
     */
    public static Map<UUID, Integer> reindexWithInsertion(
            List<UUID> columnWithoutMoving, UUID movingCardId, int position) {
        List<UUID> result = new ArrayList<>(columnWithoutMoving);
        int clamped = Math.max(0, Math.min(position, result.size()));
        result.add(clamped, movingCardId);
        return denseOrder(result);
    }

    /** Dense order for a column as given, with no insertion -- used after a delete/unlink to
     *  close the gap it leaves behind. */
    public static Map<UUID, Integer> reindex(List<UUID> column) {
        return denseOrder(column);
    }

    private static Map<UUID, Integer> denseOrder(List<UUID> column) {
        Map<UUID, Integer> order = new LinkedHashMap<>();
        for (int i = 0; i < column.size(); i++) {
            order.put(column.get(i), i);
        }
        return order;
    }
}
