package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * A card's four link lists, derived when it is read (JAVA-1114). A stored {@code blocks} edge never
 * changes; whether it still blocks depends on the blocker's status. An edge whose blocker is finished
 * leaves {@code blocks}/{@code blockedBy} on both cards and appears in {@code relatedBy} instead, so a
 * blocker sent back to To do blocks again with nobody re-linking it.
 */
public record CardLinkLists(List<String> related, List<String> blocks, List<String> blockedBy,
        List<RelatedBy> relatedBy) {

    /** {@code direction} is {@link #BLOCKED_THIS} or {@link #BLOCKED_BY_THIS}. */
    public record RelatedBy(String key, String direction) {
    }

    /** The other card was the blocker. */
    public static final String BLOCKED_THIS = "blockedThis";
    /** This card was the blocker. */
    public static final String BLOCKED_BY_THIS = "blockedByThis";

    /**
     * @param card        the card whose lists are built
     * @param links       every edge of {@code card}
     * @param blockerById the status of each card that blocks {@code card}; an edge whose blocker is
     *                    missing (a deleted card) is left out
     */
    public static CardLinkLists of(Card card, List<CardLink> links, Map<UUID, Status> blockerById) {
        List<String> related = new ArrayList<>();
        List<String> blocks = new ArrayList<>();
        List<String> blockedBy = new ArrayList<>();
        List<RelatedBy> relatedBy = new ArrayList<>();
        for (CardLink link : links) {
            String otherKey = link.otherKey(card.id());
            if (link.type() == LinkType.RELATED) {
                related.add(otherKey);
                continue;
            }
            boolean outgoing = link.sourceCardId().equals(card.id());
            Status blocker = outgoing ? card.status() : blockerById.get(link.sourceCardId());
            if (blocker == null) {
                continue;
            }
            if (blocker.finished()) {
                relatedBy.add(new RelatedBy(otherKey, outgoing ? BLOCKED_BY_THIS : BLOCKED_THIS));
            } else if (outgoing) {
                blocks.add(otherKey);
            } else {
                blockedBy.add(otherKey);
            }
        }
        return new CardLinkLists(related, blocks, blockedBy, relatedBy);
    }

    /** True while an open blocker remains. */
    public boolean blocked() {
        return !blockedBy.isEmpty();
    }
}
