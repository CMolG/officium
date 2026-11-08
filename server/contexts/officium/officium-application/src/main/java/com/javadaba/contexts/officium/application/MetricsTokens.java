package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.application.MetricsService.MetricsView;
import com.javadaba.contexts.officium.domain.ActorKind;
import com.javadaba.contexts.officium.domain.CardTimeEntry;
import com.javadaba.contexts.officium.domain.DeliveryFlow;
import com.javadaba.contexts.officium.domain.ModelPrices;
import com.javadaba.contexts.officium.domain.TokenUsage;
import com.javadaba.contexts.officium.domain.UsageCost;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * The token and contribution figures of a period (card://JAVA-1588, card://JAVA-1777): what its entries spent, by
 * model and by who, with the estimate at API list prices. Kept apart from {@link MetricsService}, which the file-size
 * bar would otherwise push past its limit.
 */
final class MetricsTokens {

    private MetricsTokens() {
    }

    /** What the period's entries spent, by model, most output first, and what a covered delivery spent on average. */
    static MetricsView.Tokens tokens(List<CardTimeEntry> time, TokenUsage perDelivery, ModelPrices prices) {
        Map<String, List<CardTimeEntry>> byModel = new LinkedHashMap<>();
        for (CardTimeEntry entry : time) {
            if (entry.tokens() != null) {
                byModel.computeIfAbsent(entry.model() == null ? "unknown" : entry.model(), k -> new ArrayList<>())
                        .add(entry);
            }
        }
        List<MetricsView.ModelTokens> models = byModel.entrySet().stream()
                .map(e -> modelTokens(e.getKey(), e.getValue(), prices))
                .sorted(Comparator.comparingLong(MetricsView.ModelTokens::tokensOut).reversed())
                .toList();
        TokenUsage total = time.stream().map(CardTimeEntry::tokens).filter(Objects::nonNull)
                .reduce(TokenUsage.ZERO, TokenUsage::plus);
        UsageCost cost = UsageCost.of(time, prices);
        return new MetricsView.Tokens(total.tokensIn(), total.cachedTokensIn(), total.reasoningTokens(),
                total.tokensOut(), models, perDelivery,
                new MetricsView.Cost(wire(cost), cost.unpricedRows(), cost.unpricedModels()));
    }

    private static MetricsView.ModelTokens modelTokens(String model, List<CardTimeEntry> rows, ModelPrices prices) {
        TokenUsage spent = rows.stream().map(CardTimeEntry::tokens).reduce(TokenUsage.ZERO, TokenUsage::plus);
        return new MetricsView.ModelTokens(model, spent.tokensIn(), spent.cachedTokensIn(), spent.reasoningTokens(),
                spent.tokensOut(), wire(UsageCost.of(rows, prices)));
    }

    /** Deliveries go to whoever made the move; hours and cost to the entry's {@code who}. An entry nobody's account
     *  typed (an agent's, by hand or imputed) counts as an agent's. */
    static List<MetricsView.Contribution> contributions(List<DeliveryFlow.Delivery> delivered,
            List<CardTimeEntry> time, ModelPrices prices) {
        Map<String, MetricsView.Contribution> byWho = new LinkedHashMap<>();
        for (DeliveryFlow.Delivery delivery : delivered) {
            String kind = delivery.by().kind() == ActorKind.AGENT ? "agent" : "person";
            byWho.merge(delivery.by().name(), new MetricsView.Contribution(delivery.by().name(), kind, 1, 0, null, 0),
                    MetricsTokens::add);
        }
        Map<String, List<CardTimeEntry>> rowsByWho = new HashMap<>();
        for (CardTimeEntry entry : time) {
            String kind = entry.accountId() == null ? "agent" : "person";
            byWho.merge(entry.who(), new MetricsView.Contribution(entry.who(), kind, 0, entry.hours(), null, 0),
                    MetricsTokens::add);
            rowsByWho.computeIfAbsent(entry.who(), k -> new ArrayList<>()).add(entry);
        }
        return byWho.values().stream()
                .map(c -> {
                    UsageCost cost = UsageCost.of(rowsByWho.getOrDefault(c.who(), List.of()), prices);
                    return new MetricsView.Contribution(c.who(), c.kind(), c.delivered(),
                            MetricsService.round(c.hours()), wire(cost), cost.unpricedRows());
                })
                .sorted(Comparator.comparingInt(MetricsView.Contribution::delivered).reversed()
                        .thenComparing(Comparator.comparingDouble(MetricsView.Contribution::hours).reversed()))
                .toList();
    }

    private static MetricsView.Contribution add(MetricsView.Contribution a, MetricsView.Contribution b) {
        return new MetricsView.Contribution(a.who(), a.kind(), a.delivered() + b.delivered(), a.hours() + b.hours(),
                null, 0);
    }

    /** The USD figure on the wire: rounded to six decimals, null when no row could be priced. */
    static Double wire(UsageCost cost) {
        Double usd = cost.usdOrNull();
        return usd == null ? null : Math.round(usd * 1_000_000) / 1_000_000.0;
    }
}
