package com.javadaba.contexts.officium.domain;

import java.util.UUID;

/**
 * One stored edge between two cards of the SAME project, shown from both ends (contract §2):
 * {@code RELATED} is symmetric (appears in both cards' {@code related}); {@code BLOCKS} is
 * directed, {@code source blocks target} (source's {@code blocks}, target's {@code blockedBy}).
 */
public record CardLink(UUID id, UUID projectId, LinkType type, UUID sourceCardId, UUID targetCardId,
        String sourceCardKey, String targetCardKey) {

    public CardLink {
        if (sourceCardId.equals(targetCardId)) {
            throw new IllegalArgumentException("A card cannot link to itself");
        }
    }

    /** Keys denormalized onto the edge (immutable once assigned) so composing a card's
     *  {@code related}/{@code blocks}/{@code blockedBy} needs no extra lookup per link. */
    public String otherKey(UUID cardId) {
        if (cardId.equals(sourceCardId)) {
            return targetCardKey;
        }
        if (cardId.equals(targetCardId)) {
            return sourceCardKey;
        }
        throw new IllegalArgumentException("Card " + cardId + " is not part of this link");
    }
}
