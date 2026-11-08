package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * The pure rules of a project's precedence list (ADR 0032, JAVA-1686): validation, the resolution of a
 * rule's epic names, and the rank of a card. The rank is built on the same resolved spellings the SQL of
 * {@code cards.next} binds, so the two agree by construction.
 */
public final class PrecedenceRules {

    private PrecedenceRules() {
    }

    /** A rule with its epic names resolved to the spellings a card may carry (see {@link #resolve}). */
    public record Resolved(PrecedenceMatch match, Set<String> epicKeys, Set<String> epicLabels) {
    }

    /** Every refusal of {@code rules}; an empty list means the list may be saved. {@code knownEpics} holds the
     *  keys and labels the project's epic cards carry. */
    public static List<PrecedenceRefusal> validate(List<PrecedenceRule> rules, Collection<String> knownEpics) {
        List<PrecedenceRefusal> refusals = new ArrayList<>();
        if (rules.size() > PrecedenceLimits.MAX_RULES) {
            refusals.add(new PrecedenceRefusal("precedence_limit", PrecedenceLimits.MAX_RULES, "rules",
                    "A project has at most " + PrecedenceLimits.MAX_RULES + " precedence rules; this list has "
                            + rules.size() + "."));
        }
        Set<String> known = normalized(knownEpics);
        Set<String> names = new HashSet<>();
        for (int i = 0; i < rules.size(); i++) {
            refusals.addAll(validateRule(i, rules.get(i), known, names));
        }
        return refusals;
    }

    private static List<PrecedenceRefusal> validateRule(int index, PrecedenceRule rule, Set<String> known,
            Set<String> names) {
        List<PrecedenceRefusal> refusals = new ArrayList<>();
        String name = rule.name() == null ? "" : rule.name().trim();
        if (name.isEmpty() || name.length() > PrecedenceLimits.NAME_MAX) {
            refusals.add(
                    invalid(index, "name", "A rule's name has 1 to " + PrecedenceLimits.NAME_MAX + " characters."));
        } else if (!names.add(name.toLowerCase(Locale.ROOT))) {
            refusals.add(new PrecedenceRefusal("precedence_name_taken", index, "name",
                    "Another rule already has the name \"" + name + "\"."));
        }
        String reason = rule.reason() == null ? "" : rule.reason().trim();
        if (reason.isEmpty() || reason.length() > PrecedenceLimits.REASON_MAX) {
            refusals.add(invalid(index, "reason",
                    "A rule's reason has 1 to " + PrecedenceLimits.REASON_MAX + " characters."));
        }
        PrecedenceMatch match = rule.match();
        if (match.namedFacets() == 0) {
            refusals.add(new PrecedenceRefusal("precedence_rule_empty", index, "match",
                    "A rule names at least one of epics, tags, categories or signals."));
        }
        refusals.addAll(limitRefusals(index, match));
        for (String epic : match.epics()) {
            if (!known.contains(epic.trim().toLowerCase(Locale.ROOT))) {
                refusals.add(new PrecedenceRefusal("precedence_epic_unknown", index, "epics",
                        "No epic is called \"" + epic + "\" in this project."));
            }
        }
        return refusals;
    }

    private static List<PrecedenceRefusal> limitRefusals(int index, PrecedenceMatch match) {
        List<PrecedenceRefusal> refusals = new ArrayList<>();
        Map<String, Integer> sizes = new HashMap<>();
        sizes.put("epics", match.epics().size());
        sizes.put("tags", match.tags().size());
        sizes.put("categories", match.categories().size());
        sizes.put("signals", match.signals().size());
        sizes.forEach((field, size) -> {
            if (size > PrecedenceLimits.MAX_VALUES) {
                refusals.add(new PrecedenceRefusal("precedence_limit", index, field,
                        "A rule names at most " + PrecedenceLimits.MAX_VALUES + " " + field + "; this one names " + size
                                + "."));
            }
        });
        return refusals;
    }

    private static PrecedenceRefusal invalid(int index, String field, String message) {
        return new PrecedenceRefusal("precedence_field_invalid", index, field, message);
    }

    /**
     * Each rule's epic names resolved the way {@link EpicChildren} resolves them: a name equal to an epic's key
     * (case-insensitive) resolves to that key, else to its label when exactly one epic carries that label.
     * A name that resolves to neither names nothing.
     */
    public static List<Resolved> resolve(List<PrecedenceRule> rules, List<Card> cards) {
        return resolveEpics(rules, cards.stream().filter(c -> c.category() == Category.EPIC)
                .map(c -> new EpicName(c.key(), c.epic())).toList());
    }

    /** An epic as a rule can name it: its key, and the label its cards may share (null when it has none). */
    public record EpicName(String key, String label) {
    }

    /** {@link #resolve} over the epics alone, for a reader that holds no whole cards. */
    public static List<Resolved> resolveEpics(List<PrecedenceRule> rules, List<EpicName> epics) {
        Map<String, Long> labelCounts = new HashMap<>();
        epics.stream().map(e -> lower(e.label())).filter(l -> !l.isEmpty())
                .forEach(l -> labelCounts.merge(l, 1L, Long::sum));
        List<Resolved> resolved = new ArrayList<>();
        for (PrecedenceRule rule : rules) {
            Set<String> keys = new HashSet<>();
            Set<String> labels = new HashSet<>();
            for (String name : rule.match().epics()) {
                String text = name.trim();
                EpicName named = named(text, epics, labelCounts);
                if (named != null) {
                    keys.add(named.key().toUpperCase(Locale.ROOT));
                    if (labelCounts.getOrDefault(lower(named.label()), 0L) == 1L) {
                        labels.add(lower(named.label()));
                    }
                }
            }
            resolved.add(new Resolved(rule.match(), keys, labels));
        }
        return resolved;
    }

    /** The epic a rule's name stands for: the one whose key it is, else the one whose unique label it is. */
    private static EpicName named(String text, List<EpicName> epics, Map<String, Long> labelCounts) {
        Optional<EpicName> byKey = epics.stream().filter(e -> e.key().equalsIgnoreCase(text)).findFirst();
        if (byKey.isPresent() || labelCounts.getOrDefault(lower(text), 0L) != 1L) {
            return byKey.orElse(null);
        }
        return epics.stream().filter(e -> lower(e.label()).equals(lower(text))).findFirst().orElse(null);
    }

    /** The 1-based position of the first rule {@code card} matches, or 0 when it matches none. An epic never
     *  matches: it is never handed out. */
    public static int rankOf(Card card, List<Resolved> resolved) {
        return rankOf(card.category(), card.epic(), card.tags(), card.signals(), resolved);
    }

    /** {@link #rankOf(Card, List)} over a card's facets alone, for a card that is not built yet (a create). */
    public static int rankOf(Category category, String epic, List<String> tags, List<Signal> signals,
            List<Resolved> resolved) {
        for (int i = 0; i < resolved.size(); i++) {
            if (matches(category, epic, tags, signals, resolved.get(i))) {
                return i + 1;
            }
        }
        return 0;
    }

    /**
     * A rule is dormant when it names epics and none of them is open (done or rejected, or gone): it stays
     * in the list and matches nothing until its epic is open again.
     */
    public static boolean dormant(PrecedenceMatch match, List<Card> cards) {
        if (match.epics().isEmpty()) {
            return false;
        }
        Resolved named = resolve(List.of(new PrecedenceRule(null, "", "", match, null)), cards).get(0);
        return cards.stream()
                .filter(c -> c.category() == Category.EPIC && !c.status().closed())
                .noneMatch(c -> named.epicKeys().contains(c.key().toUpperCase(Locale.ROOT))
                        || named.epicLabels().contains(lower(c.epic())));
    }

    /** Whether {@code card} matches every facet {@code rule} names; an epic card matches none. */
    public static boolean matches(Card card, Resolved rule) {
        return matches(card.category(), card.epic(), card.tags(), card.signals(), rule);
    }

    /** {@link #matches(Card, Resolved)} over the facets alone; {@code tags} and {@code signals} are not null. */
    public static boolean matches(Category category, String epic, List<String> tags, List<Signal> signals,
            Resolved rule) {
        PrecedenceMatch match = rule.match();
        return match.namedFacets() > 0
                && category != Category.EPIC
                && (match.epics().isEmpty() || epicMatches(epic, rule))
                && (match.tags().isEmpty() || tagMatches(tags, match.tags()))
                && (!match.categoriesNamed() || match.categories().contains(category))
                && (!match.signalsNamed() || signals.stream().anyMatch(match.signals()::contains));
    }

    private static boolean epicMatches(String epic, Resolved rule) {
        if (epic == null || epic.isBlank()) {
            return false;
        }
        return rule.epicKeys().contains(epic.trim().toUpperCase(Locale.ROOT))
                || rule.epicLabels().contains(lower(epic));
    }

    private static boolean tagMatches(List<String> cardTags, List<String> ruleTags) {
        Set<String> wanted = normalized(ruleTags);
        return cardTags.stream().map(t -> lower(t)).anyMatch(wanted::contains);
    }

    private static Set<String> normalized(Collection<String> values) {
        Set<String> out = new HashSet<>();
        values.forEach(v -> out.add(lower(v)));
        return out;
    }

    private static String lower(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
