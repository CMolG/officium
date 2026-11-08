package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-292: the one definition of an epic's children, the same rule the board's badge uses. */
class EpicChildrenTest {

    private static final UUID PROJECT = UUID.randomUUID();
    private static final Instant T0 = Instant.parse("2026-09-30T00:00:00Z");

    private static Card card(String key, Category category, String epic) {
        return new Card(UUID.randomUUID(), PROJECT, key, Integer.parseInt(key.substring(key.indexOf('-') + 1)),
                "Title " + key, null, null, Status.TODO, RunState.IDLE, Priority.MEDIUM, Executor.AI, category, 0, 0,
                epic, List.of(), List.of(), 1, T0, T0, null, null, null, null, null, null, 0, List.of(), null);
    }

    @Test
    void aChangedCardBringsItsEpicAlongUnlessTheEpicIsAlreadyThere() {
        Card epic = card("OFF-1", Category.EPIC, null);
        Card other = card("OFF-5", Category.EPIC, null);
        Card child = card("OFF-2", Category.FEATURE, "OFF-1");
        Card loose = card("OFF-3", Category.BUG, null);
        List<Card> project = List.of(epic, other, child, loose, card("OFF-6", Category.BUG, "OFF-5"));

        assertThat(EpicChildren.epicsTouchedBy(List.of(child, loose), project)).containsExactly(epic);
        assertThat(EpicChildren.epicsTouchedBy(List.of(child, epic), project)).isEmpty();
        assertThat(EpicChildren.epicsTouchedBy(List.of(loose), project)).isEmpty();
    }

    @Test
    void aCardNamingTheEpicsKeyIsItsChildWhateverTheCaseOrSpacing() {
        List<Card> cards = List.of(card("OFF-1", Category.EPIC, null), card("OFF-2", Category.FEATURE, "OFF-1"),
                card("OFF-3", Category.BUG, " off-1 "), card("OFF-4", Category.BUG, "OFF-12"));

        assertThat(EpicChildren.count("OFF-1", cards)).isEqualTo(2);
    }

    @Test
    void aCardSharingTheLabelOnlyThisEpicCarriesIsItsChild() {
        List<Card> cards = List.of(card("OFF-1", Category.EPIC, "Officium"), card("OFF-2", Category.FEATURE,
                "officium"), card("OFF-3", Category.BUG, "Sonus"));

        assertThat(EpicChildren.count("OFF-1", cards)).isEqualTo(1);
    }

    @Test
    void aLabelSeveralEpicsCarryNamesNoneOfThem() {
        List<Card> cards = List.of(card("OFF-1", Category.EPIC, "Base"), card("OFF-2", Category.EPIC, "Base"),
                card("OFF-3", Category.FEATURE, "Base"), card("OFF-4", Category.FEATURE, "OFF-2"));

        assertThat(EpicChildren.count("OFF-1", cards)).isZero();
        assertThat(EpicChildren.count("OFF-2", cards)).isEqualTo(1);
    }

    @Test
    void theEpicIsNotItsOwnChildAndALabelNoEpicCarriesNamesNothing() {
        List<Card> cards = List.of(card("OFF-1", Category.EPIC, "OFF-1"), card("OFF-2", Category.FEATURE, "Loose"),
                card("OFF-3", Category.FEATURE, null));

        assertThat(EpicChildren.count("OFF-1", cards)).isZero();
    }

    /** card://JAVA-379: every epic of the project with its children, a childless one included. */
    @Test
    void everyEpicIsListedWithItsChildren() {
        Card child = card("OFF-3", Category.FEATURE, "Officium");
        List<Card> cards = List.of(card("OFF-1", Category.EPIC, "Officium"), card("OFF-2", Category.EPIC, null),
                child, card("OFF-4", Category.BUG, null));

        assertThat(EpicChildren.byEpic(cards)).containsOnlyKeys("OFF-1", "OFF-2")
                .containsEntry("OFF-1", List.of(child)).containsEntry("OFF-2", List.of());
    }
}
