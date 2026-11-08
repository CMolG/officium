package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardSearchCriteria;
import com.javadaba.contexts.officium.domain.Page;

import java.util.List;
import java.util.UUID;

/**
 * {@code cards.search}'s real production port (promoted from a benchmark-only port on 2026-09-20,
 * after the 2026-09-19 backend comparison -- see
 * {@code doc://history/plans/2026-09-19-officium-busqueda-backends-benchmark} -- measured
 * RoaringBitmap beating Postgres/trigram and RediSearch on latency and throughput at 280 real
 * cards with zero errors). {@code CardService} resolves the active adapter via {@code
 * Instance<SearchIndexPort>} (three {@code @LookupIfProperty}-gated beans, selected at runtime by
 * {@code officium.search.provider}) and both reads and writes go through it: {@link #search} backs
 * {@code cards.search} itself, and {@link #indexUpsert}/{@link #indexUpsertBatch}/
 * {@link #indexRemove} are the write-side notifications every card mutation calls so an adapter
 * that keeps its own index (RoaringBitmap) stays correct without a rebuild-on-a-timer.
 */
public interface SearchIndexPort {

    /** Same criteria in, same {@link Page} of {@link Card} out as {@link CardRepository#search} --
     *  no parallel model. */
    Page<Card> search(UUID projectId, CardSearchCriteria criteria);

    /** Labels the benchmark's rows and disambiguates logs: {@code "postgres"} or {@code "roaring"}. */
    String providerName();

    /**
     * The card was created, or one of its INDEXED fields changed -- {@code title}, {@code
     * description}, {@code tags} or {@code epic} (never {@code status}/{@code priority}/
     * {@code executor}/{@code order}: the index doesn't search on those). Also how a soft-delete is
     * reported when the caller already has the deleted {@link Card} in hand -- {@link
     * Card#deleted()} routes an adapter straight to removing it. A no-op for an adapter with no
     * separate index to maintain (Postgres: {@code ilike} already reads live rows).
     */
    void indexUpsert(Card card);

    /**
     * Batch-friendly {@link #indexUpsert} for bulk writes (backlog import, batch card creation) --
     * a plain per-card loop by default, which is exactly what an adapter with no separate index
     * needs and cheap enough for the in-memory RoaringBitmap index not to need its own override.
     */
    default void indexUpsertBatch(List<Card> cards) {
        for (Card card : cards) {
            indexUpsert(card);
        }
    }

    /** The card was removed -- stop returning it. A no-op for an adapter with no separate index. */
    void indexRemove(UUID cardId);
}
