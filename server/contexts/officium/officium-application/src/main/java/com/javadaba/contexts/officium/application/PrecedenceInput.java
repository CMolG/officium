package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.PrecedenceDefaults;
import com.javadaba.contexts.officium.domain.PrecedenceInvalidException;
import com.javadaba.contexts.officium.domain.PrecedenceLimits;
import com.javadaba.contexts.officium.domain.PrecedenceMatch;
import com.javadaba.contexts.officium.domain.PrecedenceRefusal;
import com.javadaba.contexts.officium.domain.PrecedenceRule;
import com.javadaba.contexts.officium.domain.PrecedenceSprint;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.Signal;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

/**
 * A precedence rule as the wire sends it (ADR 0032, JAVA-1686), turned into the domain's values, for MCP and REST
 * alike. A name the tool does not know is refused with the rule's position and the field, as the list's own
 * validation refuses; the rest of the list is checked by {@link PrecedenceService}.
 */
public final class PrecedenceInput {

    private PrecedenceInput() {
    }

    /**
     * One rule as sent. {@code index} is its position in the list, for a refusal. A facet sent as null names
     * nothing; no priority means no floor; no sprint means none.
     */
    public static PrecedenceRule rule(int index, UUID id, String name, String reason, List<String> epics,
            List<String> tags, List<String> categories, List<String> signals, String priority, String sprint) {
        return new PrecedenceRule(id, name, reason,
                new PrecedenceMatch(nonNull(epics), nonNull(tags), values(index, "categories", categories,
                        Category::fromWire), values(index, "signals", signals, Signal::fromWire)),
                new PrecedenceDefaults(priority(index, priority), sprint(index, sprint)));
    }

    /** {@code meta.states.precedence}: the facets a rule may name, what its defaults do, and the caps. */
    public static Map<String, Object> describe() {
        return Map.of(
                "facets", List.of("epics", "tags", "categories", "signals"),
                "defaults", Map.of(
                        "priority", "a floor: a card below it is raised to it; an explicit priority wins",
                        "sprint", List.of(PrecedenceSprint.NONE.wire(), PrecedenceSprint.JOIN.wire())),
                "limits", Map.of(
                        "rules", PrecedenceLimits.MAX_RULES,
                        "valuesPerFacet", PrecedenceLimits.MAX_VALUES,
                        "nameLength", PrecedenceLimits.NAME_MAX,
                        "reasonLength", PrecedenceLimits.REASON_MAX));
    }

    private static <T> List<T> values(int index, String field, List<String> wire, Function<String, T> parse) {
        return nonNull(wire).stream().map(value -> {
            try {
                return parse.apply(value);
            } catch (OfficiumException | IllegalArgumentException ex) {
                throw refused(index, field, ex.getMessage());
            }
        }).toList();
    }

    private static Priority priority(int index, String wire) {
        if (wire == null) {
            return null;
        }
        try {
            return Priority.fromWire(wire);
        } catch (IllegalArgumentException ex) {
            throw refused(index, "priority", ex.getMessage());
        }
    }

    private static PrecedenceSprint sprint(int index, String wire) {
        if (wire == null) {
            return PrecedenceSprint.NONE;
        }
        try {
            return PrecedenceSprint.fromWire(wire);
        } catch (IllegalArgumentException ex) {
            throw refused(index, "sprint", ex.getMessage());
        }
    }

    private static List<String> nonNull(List<String> values) {
        return values == null ? List.of() : values;
    }

    private static PrecedenceInvalidException refused(int index, String field, String message) {
        return new PrecedenceInvalidException(new PrecedenceRefusal("precedence_field_invalid", index, field, message));
    }
}
