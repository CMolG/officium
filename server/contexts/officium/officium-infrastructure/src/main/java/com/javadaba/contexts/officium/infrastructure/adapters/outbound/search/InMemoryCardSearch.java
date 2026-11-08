package com.javadaba.contexts.officium.infrastructure.adapters.outbound.search;

import com.javadaba.contexts.officium.domain.Assignee;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardRules;
import com.javadaba.contexts.officium.domain.CardSearchCriteria;
import com.javadaba.contexts.officium.domain.Page;
import com.javadaba.contexts.officium.domain.ports.CardRepository;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;

/**
 * The non-text half of {@code JdbcCardRepository.search} (status/priority/epic/tag/executor/
 * category/assignee/blocked, sort, cursor pagination), reimplemented over an already-fetched {@code
 * List<Card>} candidate set -- what {@link RoaringBitmapSearchAdapter} needs after ITS OWN text
 * search has narrowed the candidates, since it doesn't store the other filterable columns in its
 * index. {@link PostgresTrigramSearchAdapter} doesn't need this: its candidate set already comes
 * back fully filtered from SQL.
 *
 * <p>Same offset-in-a-cursor scheme as {@code JdbcCardRepository} (reimplemented, not shared --
 * that method is private there) so a page from one backend looks exactly like a page from
 * another to whoever is comparing them.
 */
final class InMemoryCardSearch {

    private InMemoryCardSearch() {
    }

    static Page<Card> apply(List<Card> candidates, CardSearchCriteria criteria, CardRepository cards) {
        List<Card> filtered = candidates.stream()
                .filter(c -> !c.deleted())
                .filter(c -> matchesStatus(c, criteria))
                .filter(c -> matchesPriority(c, criteria))
                .filter(c -> matchesEpic(c, criteria))
                .filter(c -> matchesTag(c, criteria))
                .filter(c -> matchesExecutor(c, criteria))
                .filter(c -> criteria.category() == null || c.category() == criteria.category())
                .filter(criteria::matchesSignal)
                .filter(criteria::matchesRejection)
                .filter(c -> criteria.sprint() == null || criteria.sprint().matches(c.sprintId()))
                .filter(c -> matchesAssignee(c, criteria))
                .filter(c -> matchesBlocked(c, criteria, cards))
                .filter(c -> criteria.humanEditPending() == null || c.humanEditPending() == criteria.humanEditPending())
                .sorted(comparator(criteria.sort()))
                .toList();

        int offset = decodeCursor(criteria.cursor());
        int limit = criteria.limit();
        List<Card> window = filtered.stream().skip(offset).limit((long) limit + 1).toList();
        boolean hasMore = window.size() > limit;
        List<Card> page = hasMore ? window.subList(0, limit) : window;
        return new Page<>(page, hasMore ? encodeCursor(offset + limit) : null);
    }

    private static boolean matchesStatus(Card card, CardSearchCriteria criteria) {
        return criteria.status() == null || card.status() == criteria.status();
    }

    private static boolean matchesPriority(Card card, CardSearchCriteria criteria) {
        return criteria.priority() == null || card.priority() == criteria.priority();
    }

    private static boolean matchesEpic(Card card, CardSearchCriteria criteria) {
        return criteria.epic() == null || criteria.epic().equals(card.epic());
    }

    private static boolean matchesTag(Card card, CardSearchCriteria criteria) {
        return criteria.tag() == null || card.tags().contains(criteria.tag());
    }

    private static boolean matchesExecutor(Card card, CardSearchCriteria criteria) {
        return criteria.executor() == null || card.executor() == criteria.executor();
    }

    private static boolean matchesAssignee(Card card, CardSearchCriteria criteria) {
        CardSearchCriteria.AssigneeFilter filter = criteria.assignee();
        if (filter == null) {
            return true;
        }
        if (filter.accountId() != null) {
            return card.assignees().stream().map(Assignee::accountId).anyMatch(filter.accountId()::equals);
        }
        if (filter.name() != null) {
            return card.assignees().stream().map(Assignee::name).anyMatch(filter.name()::equals);
        }
        return true;
    }

    private static boolean matchesBlocked(Card card, CardSearchCriteria criteria, CardRepository cards) {
        if (criteria.blocked() == null) {
            return true;
        }
        boolean blocked = CardRules.isBlocked(cards.blockerStatuses(card.id()));
        return blocked == criteria.blocked();
    }

    private static Comparator<Card> comparator(CardSearchCriteria.Sort sort) {
        Comparator<Card> bySort = switch (sort) {
            case ORDER -> Comparator.comparingInt(Card::order);
            case PRIORITY -> Comparator.comparingInt(c -> c.priority().rank());
            case UPDATED -> Comparator.comparing(Card::updatedAt).reversed();
            case CREATED -> Comparator.comparing(Card::createdAt).reversed();
        };
        return bySort.thenComparing(Card::id);
    }

    private static int decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return 0;
        }
        try {
            return Integer.parseInt(new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8));
        } catch (RuntimeException ex) {
            return 0;
        }
    }

    private static String encodeCursor(int offset) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(Integer.toString(offset).getBytes(StandardCharsets.UTF_8));
    }
}
