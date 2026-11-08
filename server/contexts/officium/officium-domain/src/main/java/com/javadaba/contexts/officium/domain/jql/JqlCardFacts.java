package com.javadaba.contexts.officium.domain.jql;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.ReviewReturn;

import java.util.List;
import java.util.function.Predicate;

/**
 * What a query needs to know about a card that {@link Card} does not hold: whether it is blocked (like the flat
 * filters' own {@code matchesBlocked}, it comes from the links) and its send-backs (card://JAVA-1416, from the log).
 */
public interface JqlCardFacts {

    boolean blocked(Card card);

    List<ReviewReturn> returns(Card card);

    /** Only the blocked predicate: a card has no send-backs. */
    static JqlCardFacts blockedOnly(Predicate<Card> blocked) {
        return new JqlCardFacts() {
            @Override
            public boolean blocked(Card card) {
                return blocked.test(card);
            }

            @Override
            public List<ReviewReturn> returns(Card card) {
                return List.of();
            }
        };
    }
}
