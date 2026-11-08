package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardRoles;
import com.javadaba.contexts.officium.domain.CardSearchCriteria;
import com.javadaba.contexts.officium.domain.GoverningWorkflow;
import com.javadaba.contexts.officium.domain.Page;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.SearchIndexPort;

import java.util.List;
import java.util.UUID;
import java.util.function.Function;

/** {@code cards.search} narrowed to the cards one role may take (JAVA-535). {@code eligibleRoles} is
 *  computed, never stored, so the filter asks the project's matrix the question {@link CardView} asks
 *  and the two cannot disagree. It runs over the index's candidates, as {@code searchByJql} does. */
final class CardRoleSearch {

    private static final int MAX_CANDIDATES = 20_000;

    private CardRoleSearch() {
    }

    static Page<Card> search(SearchIndexPort index, RoleMatrix matrix, UUID projectId,
            CardSearchCriteria criteria, String role, CardRepository cards) {
        List<Card> candidates = index.search(projectId, criteria.withWindow(null, MAX_CANDIDATES)).items();
        Function<Card, GoverningWorkflow> governing = GoverningWorkflow.over(candidates, cards);
        List<Card> kept = candidates.stream()
                .filter(card -> CardRoles.eligible(matrix, card.category(), card.subtype(), card.status(),
                        card.signals(), governing.apply(card).workflow()).contains(role))
                .toList();
        return OffsetPaging.window(kept, criteria.cursor(), criteria.limit());
    }
}
