package com.javadaba.contexts.officium.domain;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.OptionalDouble;

/**
 * The versioned price table the value report prices usage with (card://JAVA-1047). A model with no
 * row at the date of the usage is unpriced: it is listed as such, never guessed from a neighbour.
 */
public record ModelPrices(List<ModelPrice> rows) {

    public ModelPrices {
        rows = List.copyOf(rows);
    }

    /** The version of {@code model} in force on {@code date}: the latest one that started by then. */
    public Optional<ModelPrice> priceAt(String model, LocalDate date) {
        return rows.stream()
                .filter(p -> p.model().equals(model) && !p.from().isAfter(date))
                .max(Comparator.comparing(ModelPrice::from));
    }

    /** The API-equivalent cost of {@code usage} on {@code date}, or empty when the model is unpriced then. */
    public OptionalDouble apiCost(String model, TokenUsage usage, LocalDate date) {
        return priceAt(model, date).map(p -> OptionalDouble.of(p.costOf(usage))).orElseGet(OptionalDouble::empty);
    }
}
