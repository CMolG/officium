package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Which cards belong to an epic, defined once (card://JAVA-292).
 *
 * <p>A card's {@code epic} is free text, written two ways across a real backlog: an epic card's key
 * ({@code JAVA-155}) or a name several cards share ({@code Officium}), which is usually the epic
 * card's own {@code epic} label too. A label names an epic by its key first, then by that label when
 * exactly ONE epic carries it: a name several epics share ("Base limpia") names none of them. It is
 * the same rule the board's epic badge resolves with ({@code epic-badge.ts}, JAVA-291), so what the
 * board shows as an epic's child is what the server counts.
 */
public final class EpicChildren {

    private EpicChildren() {
    }

    /** How many of {@code cards} (the whole project) belong to the epic keyed {@code epicKey}; the epic
     *  itself never does. */
    public static int count(String epicKey, List<Card> cards) {
        return byEpic(cards).getOrDefault(epicKey, List.of()).size();
    }

    /**
     * The epics of {@code project} that {@code changed} leaves out but holds a card of (card://JAVA-1873): a card that
     * changed changes its epic's progress, so a change feed sends the epic along with it.
     */
    public static List<Card> epicsTouchedBy(List<Card> changed, List<Card> project) {
        Set<String> listed = changed.stream().map(Card::key).collect(Collectors.toSet());
        Map<String, List<Card>> children = byEpic(project);
        return project.stream().filter(card -> card.category() == Category.EPIC && !listed.contains(card.key())
                && children.get(card.key()).stream().anyMatch(child -> listed.contains(child.key()))).toList();
    }

    /** Every epic of {@code cards} (the whole project), keyed by its key, with its children; an epic
     *  with none maps to an empty list. */
    public static Map<String, List<Card>> byEpic(List<Card> cards) {
        Map<String, String> keyByKey = new HashMap<>();
        Map<String, Optional<String>> keyByLabel = new HashMap<>();
        Map<String, List<Card>> children = new LinkedHashMap<>();
        for (Card card : cards) {
            if (card.category() != Category.EPIC) {
                continue;
            }
            children.put(card.key(), new ArrayList<>());
            keyByKey.put(card.key().toUpperCase(Locale.ROOT), card.key());
            String label = normalized(card.epic());
            if (!label.isEmpty()) {
                // A second epic with the same label makes it name neither.
                keyByLabel.merge(label, Optional.of(card.key()), (a, b) -> Optional.empty());
            }
        }
        for (Card card : cards) {
            if (card.epic() == null || card.epic().isBlank()) {
                continue;
            }
            String named = keyByKey.get(card.epic().trim().toUpperCase(Locale.ROOT));
            if (named == null) {
                named = keyByLabel.getOrDefault(normalized(card.epic()), Optional.empty()).orElse(null);
            }
            if (named != null && !named.equals(card.key())) {
                children.get(named).add(card);
            }
        }
        return children;
    }

    private static String normalized(String label) {
        return label == null ? "" : label.trim().toLowerCase(Locale.ROOT);
    }
}
