package com.javadaba.contexts.officium.domain;

import java.util.List;

/**
 * The four facets a rule can name (JAVA-1686). A card matches a facet when it has any of its values;
 * a rule matches when it matches every facet it names. An empty list means the facet is not named, except
 * that a facet holding only a value the project removed since (kept in {@code unknown} as
 * {@code "categories:<value>"} or {@code "signals:<value>"}) is still named, and then matches nothing.
 */
public record PrecedenceMatch(List<String> epics, List<String> tags, List<Category> categories,
        List<Signal> signals, List<String> unknown) {

    public PrecedenceMatch(List<String> epics, List<String> tags, List<Category> categories, List<Signal> signals) {
        this(epics, tags, categories, signals, List.of());
    }

    public PrecedenceMatch {
        epics = List.copyOf(epics);
        tags = List.copyOf(tags);
        categories = List.copyOf(categories);
        signals = List.copyOf(signals);
        unknown = List.copyOf(unknown);
    }

    /** Whether the rule names a category, a known one or a removed one. */
    public boolean categoriesNamed() {
        return !categories.isEmpty() || unknown.stream().anyMatch(value -> value.startsWith("categories:"));
    }

    /** Whether the rule names a signal, a known one or a removed one. */
    public boolean signalsNamed() {
        return !signals.isEmpty() || unknown.stream().anyMatch(value -> value.startsWith("signals:"));
    }

    /** How many facets the rule names; a rule naming none is refused (precedence_rule_empty). */
    public int namedFacets() {
        return (epics.isEmpty() ? 0 : 1) + (tags.isEmpty() ? 0 : 1) + (categoriesNamed() ? 1 : 0)
                + (signalsNamed() ? 1 : 0);
    }
}
