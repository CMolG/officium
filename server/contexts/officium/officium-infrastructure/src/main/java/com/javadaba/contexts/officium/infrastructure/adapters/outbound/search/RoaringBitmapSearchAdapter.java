package com.javadaba.contexts.officium.infrastructure.adapters.outbound.search;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardSearchCriteria;
import com.javadaba.contexts.officium.domain.Page;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.SearchIndexPort;
import io.quarkus.arc.lookup.LookupIfProperty;
import jakarta.enterprise.context.ApplicationScoped;
import org.roaringbitmap.RoaringBitmap;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * The default {@code cards.search} backend since 2026-09-20: an in-memory inverted index over
 * {@code title}+{@code description}+{@code tags}, one {@link RoaringBitmap} of card positions per
 * token, intersected across a multi-term query. Picked over Postgres/trigram and RediSearch after
 * the 2026-09-19 benchmark measured it fastest and cheapest to operate (pure-Java, no
 * infrastructure) at 280 real cards, zero errors -- see
 * {@code doc://history/plans/2026-09-19-officium-busqueda-backends-benchmark}.
 *
 * <p><b>Real incremental maintenance, not a rebuild-on-a-timer.</b> {@link #indexUpsert}/{@link
 * #indexRemove} (called by {@code CardService} and {@code BacklogImportExportService} right after
 * their own write succeeds -- see those classes) update a card's token membership in place: its
 * OLD tokens are cleared from the bitmaps that pointed to it before its NEW tokens are added, using
 * a reverse index ({@code tokensByCardId} inside {@link ProjectIndex}) to know exactly what to
 * clear. A card is findable/un-findable the instant the notification lands, no TTL involved. The
 * only time-based rebuild left is {@link #RECONCILE_INTERVAL} -- a MUCH less frequent (hourly, not
 * the old 30s) self-healing safety net against any write path that might one day bypass the
 * notification hooks, not the fast path for an ordinary write.
 */
@ApplicationScoped
@LookupIfProperty(name = "officium.search.provider", stringValue = "roaring")
public class RoaringBitmapSearchAdapter implements SearchIndexPort {

    private static final Duration RECONCILE_INTERVAL = Duration.ofHours(1);

    private final CardRepository cards;
    private final Map<UUID, ProjectIndex> indexByProject = new ConcurrentHashMap<>();

    public RoaringBitmapSearchAdapter(CardRepository cards) {
        this.cards = cards;
    }

    @Override
    public Page<Card> search(UUID projectId, CardSearchCriteria criteria) {
        ProjectIndex index = indexFor(projectId);
        List<Card> candidates = index.candidatesFor(CardTokenizer.queryTerms(criteria.text()));
        return InMemoryCardSearch.apply(candidates, criteria, cards);
    }

    @Override
    public String providerName() {
        return "roaring";
    }

    @Override
    public void indexUpsert(Card card) {
        indexFor(card.projectId()).upsert(card);
    }

    @Override
    public void indexRemove(UUID cardId) {
        for (ProjectIndex index : indexByProject.values()) {
            if (index.remove(cardId)) {
                return;
            }
        }
    }

    /** Lazily built on first search/write per project, then kept live by {@link #indexUpsert}/
     *  {@link #indexRemove}; only rebuilt wholesale again once {@link ProjectIndex#stale()}, the
     *  hourly safety net. {@code compute} (not a plain get-check-build-put) so two threads racing
     *  on the same project's stale/missing index can't have an older rebuild's {@code put} silently
     *  overwrite a newer one -- {@link ConcurrentHashMap#compute} serializes both against the same
     *  key, so whichever runs is the one that stays, and a concurrent {@link #indexUpsert} for this
     *  same project waits behind it instead of racing it. */
    private ProjectIndex indexFor(UUID projectId) {
        return indexByProject.compute(projectId, (id, existing) -> (existing != null && !existing.stale())
                ? existing
                : ProjectIndex.build(cards.findAllByProject(id)));
    }

    /**
     * One project's mutable index: a stable integer "position" per card id (never shifted while the
     * card is live, so removing one card never invalidates another card's bitmap membership --
     * unlike indexing straight into a {@code List}'s positions), the token -> bitmap-of-positions
     * map, and the reverse {@code tokensByCardId} index an update/delete needs to know exactly which
     * bitmaps to clear a card from. A removed card's position is pushed onto {@link #freePositions}
     * and reused by the next new card instead of {@link #nextPosition} growing forever under
     * long-run create/delete churn (same fix curriculum's sibling {@code MutableOfferIndex} already
     * has). Every mutating/reading operation is synchronized on the instance so a concurrent write
     * never observes a half-updated bitmap mid-search.
     */
    private static final class ProjectIndex {

        private final Map<UUID, Integer> positionByCardId = new HashMap<>();
        private final Map<Integer, Card> cardsByPosition = new HashMap<>();
        private final Map<UUID, Set<String>> tokensByCardId = new HashMap<>();
        private final Map<String, RoaringBitmap> byToken = new HashMap<>();
        private final Deque<Integer> freePositions = new ArrayDeque<>();
        private final Instant builtAt;
        private int nextPosition;

        private ProjectIndex(Instant builtAt) {
            this.builtAt = builtAt;
        }

        static ProjectIndex build(List<Card> allCards) {
            ProjectIndex index = new ProjectIndex(Instant.now());
            for (Card card : allCards) {
                if (!card.deleted()) {
                    index.upsert(card);
                }
            }
            return index;
        }

        boolean stale() {
            return Duration.between(builtAt, Instant.now()).compareTo(RECONCILE_INTERVAL) > 0;
        }

        synchronized void upsert(Card card) {
            if (card.deleted()) {
                remove(card.id());
                return;
            }
            Integer position = positionByCardId.get(card.id());
            if (position == null) {
                position = allocatePosition();
                positionByCardId.put(card.id(), position);
            }
            cardsByPosition.put(position, card);
            clearTokens(card.id(), position);
            Set<String> tokens = CardTokenizer.tokenize(card.title(), card.description(), card.actionPlan(),
                    String.join(" ", card.tags()));
            for (String token : tokens) {
                byToken.computeIfAbsent(token, ignored -> new RoaringBitmap()).add(position);
            }
            tokensByCardId.put(card.id(), tokens);
        }

        synchronized boolean remove(UUID cardId) {
            Integer position = positionByCardId.remove(cardId);
            if (position == null) {
                return false;
            }
            clearTokens(cardId, position);
            cardsByPosition.remove(position);
            freePositions.push(position);
            return true;
        }

        private int allocatePosition() {
            Integer reused = freePositions.poll();
            return reused != null ? reused : nextPosition++;
        }

        /** Removes {@code position} from every bitmap {@code cardId}'s CURRENT tokens point to
         *  (dropping a bitmap once it's empty) -- the reverse-index step that makes an update/delete
         *  precise instead of "rebuild everything". */
        private void clearTokens(UUID cardId, int position) {
            Set<String> oldTokens = tokensByCardId.remove(cardId);
            if (oldTokens == null) {
                return;
            }
            for (String token : oldTokens) {
                RoaringBitmap bitmap = byToken.get(token);
                if (bitmap == null) {
                    continue;
                }
                bitmap.remove(position);
                if (bitmap.isEmpty()) {
                    byToken.remove(token);
                }
            }
        }

        synchronized List<Card> candidatesFor(List<String> terms) {
            if (terms.isEmpty()) {
                return List.copyOf(cardsByPosition.values());
            }
            RoaringBitmap matches = null;
            for (String term : terms) {
                RoaringBitmap bitmap = byToken.get(term);
                if (bitmap == null) {
                    return List.of();
                }
                matches = matches == null ? bitmap.clone() : RoaringBitmap.and(matches, bitmap);
                if (matches.isEmpty()) {
                    return List.of();
                }
            }
            List<Card> result = new ArrayList<>(matches.getCardinality());
            RoaringBitmap finalMatches = matches;
            finalMatches.forEach((int position) -> {
                Card card = cardsByPosition.get(position);
                if (card != null) {
                    result.add(card);
                }
            });
            return result;
        }
    }
}
