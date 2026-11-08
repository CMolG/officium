package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardTimeEntry;
import com.javadaba.contexts.officium.domain.DeliveryFlow;
import com.javadaba.contexts.officium.domain.ModelPrices;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.ReportPeriod;
import com.javadaba.contexts.officium.domain.SessionOverhead;
import com.javadaba.contexts.officium.domain.ValueAttribution;
import com.javadaba.contexts.officium.domain.ValueBreakdown;
import com.javadaba.contexts.officium.domain.ValueFigures;
import com.javadaba.contexts.officium.domain.ports.AccountSubscriptionRepository;
import com.javadaba.contexts.officium.domain.ports.ActivityRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.CardTimeEntryRepository;
import com.javadaba.contexts.officium.domain.ports.SessionOverheadRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Instant;
import java.time.YearMonth;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalDouble;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The value report of a project (card://JAVA-1047): what its agents delivered in a UTC month, what their usage
 * was worth at API prices, and what that is per subscription dollar. Free to every project reader; the prices of
 * the ratios leave only when the fee is the reader's own price: no figure reveals a price anyone else set.
 */
@ApplicationScoped
public class ValueService {

    static final double MAX_MONTHLY_USD = 10_000;

    private final ProjectAccessGuard guard;
    private final CardRepository cards;
    private final ActivityRepository activity;
    private final CardTimeEntryRepository entries;
    private final SessionOverheadRepository overhead;
    private final AccountSubscriptionRepository subscriptions;
    private final ModelPriceTable priceTable;

    @Inject
    public ValueService(ProjectAccessGuard guard, CardRepository cards, ActivityRepository activity,
            CardTimeEntryRepository entries, SessionOverheadRepository overhead,
            AccountSubscriptionRepository subscriptions, ModelPriceTable priceTable) {
        this.guard = guard;
        this.cards = cards;
        this.activity = activity;
        this.entries = entries;
        this.overhead = overhead;
        this.subscriptions = subscriptions;
        this.priceTable = priceTable;
    }

    /** The month and the one before it beside it, for the comparison the tab shows. */
    public View report(UUID accountId, UUID projectId, YearMonth month) {
        guard.requireAccess(projectId, accountId);
        Map<UUID, Card> byId = cards.findAllByProject(projectId).stream()
                .collect(Collectors.toMap(Card::id, Function.identity()));
        List<DeliveryFlow.Move> moves = activity.listByOperation(projectId, "card.moved").stream()
                .map(DeliveryFlow::moveOf).flatMap(Optional::stream).toList();
        ModelPrices prices = priceTable.prices();
        Inputs now = inputs(projectId, new ReportPeriod(month), byId, moves);
        Inputs before = inputs(projectId, new ReportPeriod(month.minusMonths(1)), byId, moves);
        return new View(month.toString(), figures(now, prices, fee(accountId, now)),
                figures(before, prices, fee(accountId, before)),
                ValueBreakdown.of(now.delivered(), now.time(), now.rest(), prices));
    }

    /** One period's inputs: the cards delivered in it, its card time and its cardless sessions. */
    private record Inputs(List<ValueAttribution.Delivered> delivered, List<CardTimeEntry> time,
            List<SessionOverhead> rest) {
    }

    private Inputs inputs(UUID projectId, ReportPeriod period, Map<UUID, Card> byId,
            List<DeliveryFlow.Move> moves) {
        List<CardTimeEntry> time = entries.listByProjectAndRange(projectId, period.month().atDay(1),
                period.month().atEndOfMonth(), null);
        List<SessionOverhead> rest = overhead.listByProjectAndRange(projectId, period.start(), period.end());
        List<ValueAttribution.Delivered> delivered = DeliveryFlow.deliveries(moves).stream()
                .filter(d -> period.contains(d.deliveredAt()))
                .filter(d -> byId.containsKey(d.cardId()))
                .map(d -> new ValueAttribution.Delivered(d.cardId(), byId.get(d.cardId()).category(), 0))
                .toList();
        return new Inputs(delivered, time, rest);
    }

    private ValueFigures.Figures figures(Inputs period, ModelPrices prices, OptionalDouble fee) {
        return ValueFigures.of(period.delivered(), period.time(), period.rest(), prices, fee);
    }

    /** The account's own monthly subscription price, none until it sets one. Private: nobody else reads it. */
    public Optional<Double> subscriptionOf(UUID accountId) {
        return subscriptions.monthlyUsdOf(accountId);
    }

    /** Sets the account's monthly price, in USD; a price is a finite amount of zero or more. */
    public void setSubscription(UUID accountId, double monthlyUsd, Instant now) {
        if (!Double.isFinite(monthlyUsd) || monthlyUsd < 0 || monthlyUsd > MAX_MONTHLY_USD) {
            throw OfficiumException.badRequest("invalid_subscription",
                    "The monthly price is a dollar amount from 0 to " + MAX_MONTHLY_USD);
        }
        subscriptions.save(accountId, monthlyUsd, now);
    }

    /** The fee the ratios of the period divide by, and only the reader's own: it is their price when every account
     *  that reported in the period is the reader (none, or only them) and they have set one. Any other reporter
     *  makes the fee unknown to this reader, so no ratio leaks a price they did not set. */
    private OptionalDouble fee(UUID accountId, Inputs period) {
        Set<UUID> reporters = new LinkedHashSet<>();
        period.time().stream().map(ValueService::reporterOf).flatMap(Optional::stream).forEach(reporters::add);
        period.rest().stream().map(SessionOverhead::accountId).filter(id -> id != null).forEach(reporters::add);
        if (!Set.of(accountId).containsAll(reporters)) {
            return OptionalDouble.empty();
        }
        return subscriptions.monthlyUsdOf(accountId).map(OptionalDouble::of).orElseGet(OptionalDouble::empty);
    }

    /** The account a card entry was reported by: its session ref opens with it (SessionUsageService). A run's entry
     *  has none. */
    private static Optional<UUID> reporterOf(CardTimeEntry entry) {
        if (entry.sessionRef() == null || !entry.sessionRef().contains(":")) {
            return Optional.empty();
        }
        return Optional.of(UUID.fromString(entry.sessionRef().substring(0, entry.sessionRef().indexOf(':'))));
    }

    /** One month and the month before it, for the comparison, and the month's split by category, phase and model. */
    public record View(String month, ValueFigures.Figures current, ValueFigures.Figures previous,
            ValueBreakdown.Breakdown breakdown) {
    }
}
