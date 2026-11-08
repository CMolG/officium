package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.OrderReindexer;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.CardRepository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** The column renumbering a move asks the repository to write: the source column closing the gap, the destination opening one. */
record MoveOrders(Map<UUID, Integer> source, Map<UUID, Integer> dest) {

    static MoveOrders of(CardRepository cards, UUID projectId, Status from, Status to, UUID cardId, int position) {
        List<UUID> sourceWithoutMoving = cards.columnOrder(projectId, from).stream()
                .filter(id -> !id.equals(cardId)).toList();
        if (from == to) {
            return new MoveOrders(Map.of(), OrderReindexer.reindexWithInsertion(sourceWithoutMoving, cardId, position));
        }
        Map<UUID, Integer> source = OrderReindexer.reindex(sourceWithoutMoving);
        if (to.closed()) {
            // Completed and Rejected have no column and are read newest first, so the card takes the end
            // whatever `position` says: the list only grows, and renumbering all of it on every move would
            // make closing a card dearer the more cards are closed.
            return new MoveOrders(source, Map.of(cardId, cards.columnOrder(projectId, to).size()));
        }
        return new MoveOrders(source,
                OrderReindexer.reindexWithInsertion(cards.columnOrder(projectId, to), cardId, position));
    }
}
