package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** JAVA-1686: the pure rank of a card against a project's precedence list, and the list's refusals. */
class PrecedenceRulesTest {

    private static final UUID PROJECT = UUID.randomUUID();
    private static final Instant T0 = Instant.parse("2026-10-20T00:00:00Z");
    private static final PrecedenceDefaults NONE = new PrecedenceDefaults(null, PrecedenceSprint.NONE);

    private static Card card(String key, Category category, String epic, List<String> tags, List<Signal> signals) {
        return new Card(UUID.randomUUID(), PROJECT, key, Integer.parseInt(key.substring(key.indexOf('-') + 1)),
                "Title " + key, null, null, Status.TODO, RunState.IDLE, Priority.MEDIUM, Executor.AI, category, 0, 0,
                epic, tags, List.of(), 1, T0, T0, null, null, null, null, null, null, 0, signals, null);
    }

    private static Card card(String key, Category category, String epic) {
        return card(key, category, epic, List.of(), List.of());
    }

    private static PrecedenceRule rule(String name, PrecedenceMatch match) {
        return new PrecedenceRule(UUID.randomUUID(), name, "Because " + name, match, NONE);
    }

    private static PrecedenceMatch tags(String... values) {
        return new PrecedenceMatch(List.of(), List.of(values), List.of(), List.of());
    }

    private static PrecedenceMatch epic(String... values) {
        return new PrecedenceMatch(List.of(values), List.of(), List.of(), List.of());
    }

    @Test
    void aFacetMatchesWhenTheCardHasAnyOfItsValues() {
        Card card = card("OFF-2", Category.BUG, null, List.of("payments", "ui"), List.of());
        List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(List.of(rule("Tags", tags("api", "UI"))),
                List.of(card));

        assertThat(PrecedenceRules.rankOf(card, resolved)).isEqualTo(1);
    }

    @Test
    void aRuleMatchesOnlyWhenEveryFacetItNamesMatches() {
        Card card = card("OFF-2", Category.FEATURE, null, List.of("x"), List.of());
        PrecedenceMatch tagAndCategory = new PrecedenceMatch(List.of(), List.of("x"), List.of(Category.BUG),
                List.of());
        List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(List.of(rule("Both", tagAndCategory)),
                List.of(card));

        assertThat(PrecedenceRules.rankOf(card, resolved)).isZero();
    }

    @Test
    void signalsAndCategoriesMatchOnTheirWireValues() {
        Card card = card("OFF-2", Category.SECURITY, null, List.of(), List.of(Signal.TOUCHES_UI));
        PrecedenceMatch signal = new PrecedenceMatch(List.of(), List.of(), List.of(), List.of(Signal.TOUCHES_UI));
        PrecedenceMatch category = new PrecedenceMatch(List.of(), List.of(), List.of(Category.SECURITY), List.of());
        List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(
                List.of(rule("Signal", signal), rule("Category", category)), List.of(card));

        assertThat(PrecedenceRules.rankOf(card, resolved)).isEqualTo(1);
    }

    @Test
    void aCardInTwoRulesRanksByTheFirstOne() {
        Card card = card("OFF-2", Category.BUG, null, List.of("a", "b"), List.of());
        List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(
                List.of(rule("Only-b", tags("b")), rule("Only-a", tags("a"))), List.of(card));

        assertThat(PrecedenceRules.rankOf(card, resolved)).isEqualTo(1);
    }

    @Test
    void aCardMatchingNoRuleRanksZero() {
        Card card = card("OFF-2", Category.BUG, null, List.of("c"), List.of());
        List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(List.of(rule("A", tags("a"))),
                List.of(card));

        assertThat(PrecedenceRules.rankOf(card, resolved)).isZero();
    }

    @Test
    void aRuleNamingAnEpicByItsKeyRanksItsChildrenByTheirKeyAndByItsUniqueLabel() {
        List<Card> cards = List.of(card("OFF-1", Category.EPIC, "Officium"),
                card("OFF-2", Category.FEATURE, "OFF-1"), card("OFF-3", Category.FEATURE, "officium"),
                card("OFF-4", Category.FEATURE, "Sonus"));
        List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(List.of(rule("Key", epic("OFF-1"))), cards);

        assertThat(PrecedenceRules.rankOf(cards.get(1), resolved)).isEqualTo(1);
        assertThat(PrecedenceRules.rankOf(cards.get(2), resolved)).isEqualTo(1);
        assertThat(PrecedenceRules.rankOf(cards.get(3), resolved)).isZero();
    }

    @Test
    void aRuleNamingAnEpicByItsUniqueLabelRanksItsChildrenByTheirKeyAndByTheLabel() {
        List<Card> cards = List.of(card("OFF-1", Category.EPIC, "Officium"),
                card("OFF-2", Category.FEATURE, "OFF-1"), card("OFF-3", Category.FEATURE, "officium"),
                card("OFF-4", Category.FEATURE, "Sonus"));
        List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(
                List.of(rule("Label", epic("Officium"))), cards);

        assertThat(PrecedenceRules.rankOf(cards.get(1), resolved)).isEqualTo(1);
        assertThat(PrecedenceRules.rankOf(cards.get(2), resolved)).isEqualTo(1);
        assertThat(PrecedenceRules.rankOf(cards.get(3), resolved)).isZero();
    }

    @Test
    void aLabelSeveralEpicsCarryNamesNoneOfThem() {
        List<Card> cards = List.of(card("OFF-1", Category.EPIC, "Base"), card("OFF-2", Category.EPIC, "Base"),
                card("OFF-3", Category.FEATURE, "Base"));
        List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(List.of(rule("Base", epic("Base"))), cards);

        assertThat(PrecedenceRules.rankOf(cards.get(2), resolved)).isZero();
    }

    @Test
    void anEpicCardIsNeverRankedEvenWhenItsTagsMatch() {
        Card epic = card("OFF-1", Category.EPIC, null, List.of("x"), List.of());
        List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(List.of(rule("X", tags("x"))), List.of(epic));

        assertThat(PrecedenceRules.rankOf(epic, resolved)).isZero();
    }

    @Test
    void theRankAgreesWithEpicChildrenOnAProjectWithEveryKindOfName() {
        List<Card> cards = new ArrayList<>();
        cards.add(card("OFF-1", Category.EPIC, "Officium"));
        cards.add(card("OFF-2", Category.EPIC, "Base"));
        cards.add(card("OFF-3", Category.EPIC, "Base"));
        cards.add(card("OFF-4", Category.FEATURE, "OFF-1"));
        cards.add(card("OFF-5", Category.FEATURE, " off-1 "));
        cards.add(card("OFF-6", Category.FEATURE, "officium"));
        cards.add(card("OFF-7", Category.FEATURE, "Base"));
        cards.add(card("OFF-8", Category.FEATURE, "OFF-12"));
        cards.add(card("OFF-9", Category.FEATURE, null));
        for (String epicKey : List.of("OFF-1", "OFF-2")) {
            for (String name : List.of(epicKey, epicKey.equals("OFF-1") ? "Officium" : "Base")) {
                List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(List.of(rule("E", epic(name))),
                        cards);
                List<Card> children = EpicChildren.byEpic(cards).get(epicKey);
                for (Card card : cards) {
                    boolean child = children.stream().anyMatch(c -> c.key().equals(card.key()));
                    assertThat(PrecedenceRules.rankOf(card, resolved) == 1)
                            .as("%s for epic %s named %s", card.key(), epicKey, name).isEqualTo(child);
                }
            }
        }
    }

    @Test
    void anEmptyRuleAndAnUnknownEpicAreRefused() {
        List<PrecedenceRule> rules = List.of(rule("Empty", new PrecedenceMatch(List.of(), List.of(), List.of(),
                List.of())), rule("Ghost", epic("NOPE-9")));
        List<PrecedenceRefusal> refusals = PrecedenceRules.validate(rules, List.of("OFF-1", "Officium"));

        assertThat(refusals).extracting(PrecedenceRefusal::code)
                .containsExactly("precedence_rule_empty", "precedence_epic_unknown");
        assertThat(refusals).extracting(PrecedenceRefusal::ruleIndex).containsExactly(0, 1);
        assertThat(refusals.get(1).field()).isEqualTo("epics");
    }

    @Test
    void aDuplicateNameAndABadNameOrReasonAreRefusedWithTheField() {
        PrecedenceRule first = rule("Same", tags("a"));
        PrecedenceRule twin = rule("same", tags("b"));
        PrecedenceRule longName = new PrecedenceRule(null, "x".repeat(81), "ok", tags("c"), NONE);
        PrecedenceRule noReason = new PrecedenceRule(null, "Fine", " ", tags("d"), NONE);
        List<PrecedenceRefusal> refusals = PrecedenceRules.validate(List.of(first, twin, longName, noReason),
                List.of());

        assertThat(refusals).extracting(PrecedenceRefusal::code).containsExactly("precedence_name_taken",
                "precedence_field_invalid", "precedence_field_invalid");
        assertThat(refusals).extracting(PrecedenceRefusal::field).containsExactly("name", "name", "reason");
        assertThat(refusals).extracting(PrecedenceRefusal::ruleIndex).containsExactly(1, 2, 3);
    }

    @Test
    void aTwentyFirstRuleAndATwentyFirstValueAreRefusedAsLimits() {
        List<PrecedenceRule> rules = new ArrayList<>();
        for (int i = 0; i < 21; i++) {
            rules.add(rule("Rule " + i, tags("t" + i)));
        }
        List<String> twentyOne = new ArrayList<>();
        for (int i = 0; i < 21; i++) {
            twentyOne.add("tag " + i);
        }
        rules.add(rule("Many", tags(twentyOne.toArray(String[]::new))));
        List<PrecedenceRefusal> refusals = PrecedenceRules.validate(rules, List.of());

        assertThat(refusals).extracting(PrecedenceRefusal::code).containsOnly("precedence_limit");
        assertThat(refusals).extracting(PrecedenceRefusal::field).containsExactly("rules", "tags");
        assertThat(refusals.get(0).ruleIndex()).isEqualTo(20);
        assertThat(refusals.get(1).ruleIndex()).isEqualTo(21);
    }

    @Test
    void aValidListHasNoRefusals() {
        List<PrecedenceRule> rules = List.of(rule("Officium", epic("Officium")), rule("Security",
                new PrecedenceMatch(List.of(), List.of(), List.of(Category.SECURITY), List.of())));

        assertThat(PrecedenceRules.validate(rules, List.of("OFF-1", "Officium"))).isEmpty();
    }

    @Test
    void aRuleWhoseOnlyCategoryIsRemovedRanksNoCard() {
        Card card = card("OFF-2", Category.BUG, null);
        PrecedenceMatch removed = new PrecedenceMatch(List.of(), List.of(), List.of(), List.of(),
                List.of("categories:retired"));
        List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(List.of(rule("Gone", removed)),
                List.of(card));

        assertThat(PrecedenceRules.rankOf(card, resolved)).isZero();
    }

    @Test
    void aRuleWithOneLiveAndOneRemovedCategoryMatchesByTheLiveOne() {
        Card card = card("OFF-2", Category.BUG, null);
        PrecedenceMatch mixed = new PrecedenceMatch(List.of(), List.of(), List.of(Category.BUG), List.of(),
                List.of("categories:retired"));
        List<PrecedenceRules.Resolved> resolved = PrecedenceRules.resolve(List.of(rule("Mixed", mixed)), List.of(card));

        assertThat(PrecedenceRules.rankOf(card, resolved)).isEqualTo(1);
    }

    @Test
    void aRemovedValueStillCountsItsFacetAsNamed() {
        PrecedenceMatch removed = new PrecedenceMatch(List.of(), List.of(), List.of(), List.of(),
                List.of("signals:retired"));

        assertThat(removed.namedFacets()).isEqualTo(1);
        assertThat(PrecedenceRules.validate(List.of(rule("Gone", removed)), List.of())).isEmpty();
    }
}
