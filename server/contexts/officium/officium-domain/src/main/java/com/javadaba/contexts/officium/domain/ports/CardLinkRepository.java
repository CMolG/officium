package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.CardLink;
import com.javadaba.contexts.officium.domain.LinkType;

import java.util.List;
import java.util.UUID;

public interface CardLinkRepository {

    CardLink insert(CardLink link);

    /** Every {@code blocks} edge of the project -- what {@code BlocksCycleDetector} needs. */
    List<CardLink> findAllBlocksEdges(UUID projectId);

    /** Every link touching this card, either end, both types. */
    List<CardLink> findByCard(UUID cardId);

    /** {@link #findByCard} for a whole list in one read: every link with either end in {@code cardIds}, once. */
    default List<CardLink> findByCards(java.util.Collection<UUID> cardIds) {
        java.util.Map<UUID, CardLink> byId = new java.util.LinkedHashMap<>();
        cardIds.forEach(id -> findByCard(id).forEach(link -> byId.putIfAbsent(link.id(), link)));
        return List.copyOf(byId.values());
    }

    void delete(UUID projectId, UUID cardId, LinkType type, UUID otherCardId);

    /** All links of a card being deleted -- soft-deleting a card drops its edges too. */
    void deleteAllForCard(UUID cardId);
}
