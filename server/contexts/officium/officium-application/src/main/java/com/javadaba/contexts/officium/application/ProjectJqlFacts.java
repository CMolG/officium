package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.ReviewReturn;
import com.javadaba.contexts.officium.domain.jql.JqlCardFacts;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Predicate;
import java.util.function.Supplier;

/** What an OQL search knows of a card beyond its fields: the blocked predicate, and the project's send-backs read once, on demand. */
final class ProjectJqlFacts implements JqlCardFacts {

    private final Predicate<Card> blocked;
    private final Supplier<Map<UUID, List<ReviewReturn>>> loadReturns;
    private Map<UUID, List<ReviewReturn>> returns;

    ProjectJqlFacts(Predicate<Card> blocked, Supplier<Map<UUID, List<ReviewReturn>>> loadReturns) {
        this.blocked = blocked;
        this.loadReturns = loadReturns;
    }

    @Override
    public boolean blocked(Card card) {
        return blocked.test(card);
    }

    @Override
    public List<ReviewReturn> returns(Card card) {
        if (returns == null) {
            returns = loadReturns.get();
        }
        return returns.getOrDefault(card.id(), List.of());
    }
}
