package com.javadaba.contexts.officium.domain;

import java.util.List;
import java.util.OptionalDouble;
import java.util.TreeSet;

/**
 * What recorded usage would cost at API list prices (card://JAVA-1777): an estimate, for a subscription that
 * charges a flat fee. A row whose model has no price on its day is counted in {@code unpricedRows} and named in
 * {@code unpricedModels}, never valued; a figure with no priced row behind it is null, not zero.
 */
public record UsageCost(double usd, int pricedRows, int unpricedRows, List<String> unpricedModels) {

    /** The cost of the rows that spent tokens; a row with no tokens, or no date, is not a usage row. */
    public static UsageCost of(List<CardTimeEntry> rows, ModelPrices prices) {
        double usd = 0;
        int priced = 0;
        TreeSet<String> unpriced = new TreeSet<>();
        int unpricedRows = 0;
        for (CardTimeEntry row : rows) {
            if (row.tokens() == null || row.tokens().isZero() || row.date() == null) {
                continue;
            }
            OptionalDouble cost = prices.apiCost(row.model(), row.tokens(), row.date());
            if (cost.isPresent()) {
                usd += cost.getAsDouble();
                priced++;
            } else {
                unpricedRows++;
                unpriced.add(row.model() == null ? "(no model)" : row.model());
            }
        }
        return new UsageCost(usd, priced, unpricedRows, List.copyOf(unpriced));
    }

    /** The USD figure, or null when no row could be priced. */
    public Double usdOrNull() {
        return pricedRows == 0 ? null : usd;
    }
}
