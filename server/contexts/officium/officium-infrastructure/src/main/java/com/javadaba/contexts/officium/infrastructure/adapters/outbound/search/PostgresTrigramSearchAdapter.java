package com.javadaba.contexts.officium.infrastructure.adapters.outbound.search;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardSearchCriteria;
import com.javadaba.contexts.officium.domain.Page;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.SearchIndexPort;
import io.quarkus.arc.lookup.LookupIfProperty;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

/**
 * The rollback path (2026-09-20 cutover to RoaringBitmap as the default -- see
 * {@code doc://history/plans/2026-09-19-officium-busqueda-backends-benchmark}): the exact {@code
 * ilike '%text%'} query {@code JdbcCardRepository} always ran for {@code cards.search}, now behind
 * the same {@link SearchIndexPort} contract as RoaringBitmap so {@code officium.search.provider}
 * can flip back to it with a config change and a restart if roaring ever needs to be pulled. No SQL
 * duplicated here on purpose (house rule §4, step 1) -- {@link CardRepository#search} IS the query;
 * this adapter only exists so the port can select it at runtime.
 */
@ApplicationScoped
@LookupIfProperty(name = "officium.search.provider", stringValue = "postgres")
public class PostgresTrigramSearchAdapter implements SearchIndexPort {

    private final CardRepository cards;

    public PostgresTrigramSearchAdapter(CardRepository cards) {
        this.cards = cards;
    }

    @Override
    public Page<Card> search(UUID projectId, CardSearchCriteria criteria) {
        return cards.search(projectId, criteria);
    }

    @Override
    public String providerName() {
        return "postgres";
    }

    /** No-op: {@code ilike} reads whatever is live in {@code officium_card} on every call, so
     *  there's no separate index for a write to go stale in. */
    @Override
    public void indexUpsert(Card card) {
        // nothing to maintain
    }

    /** No-op, same reason as {@link #indexUpsert}. */
    @Override
    public void indexRemove(UUID cardId) {
        // nothing to maintain
    }
}
