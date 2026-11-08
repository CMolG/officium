package com.javadaba.contexts.officium.domain;

import com.javadaba.contexts.officium.domain.DocStars.Target;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** JAVA-799: how a person's starred list is ordered. */
class DocStarsTest {

    private final Target a = Target.page(UUID.randomUUID());
    private final Target b = Target.page(UUID.randomUUID());
    private final Target c = Target.collection(UUID.randomUUID());

    @Test
    void aNewStarGoesLastWithoutAPosition() {
        assertThat(DocStars.place(List.of(a, b), c, null)).containsExactly(a, b, c);
    }

    @Test
    void starringAgainWithoutAPositionKeepsThePlace() {
        assertThat(DocStars.place(List.of(a, b, c), b, null)).containsExactly(a, b, c);
    }

    @Test
    void aPositionMovesAStarAndClampsToTheList() {
        List<Target> source = List.of(a, b, c);
        assertThat(DocStars.place(source, c, 0)).containsExactly(c, a, b);
        assertThat(DocStars.place(source, c, 1)).containsExactly(a, c, b);
        assertThat(DocStars.place(source, a, 9)).containsExactly(b, c, a);
        assertThat(DocStars.place(source, c, -3)).containsExactly(c, a, b);
    }

    @Test
    void aPositionPlacesANewStarAmongTheOthers() {
        assertThat(DocStars.place(List.of(a, b), c, 1)).containsExactly(a, c, b);
        assertThat(DocStars.place(List.of(a, b), c, 99)).containsExactly(a, b, c);
        assertThat(DocStars.place(List.of(), c, 3)).containsExactly(c);
    }

    @Test
    void aPositionCountsOnlyTheStarsThePersonCanSee() {
        Target hidden = Target.page(UUID.randomUUID());
        List<Target> stored = List.of(a, hidden, b, c);
        java.util.function.Predicate<Target> listed = target -> !target.equals(hidden);
        assertThat(DocStars.place(stored, c, 1, listed)).containsExactly(a, hidden, c, b);
        assertThat(DocStars.place(stored, c, 0, listed)).containsExactly(c, a, hidden, b);
        assertThat(DocStars.place(stored, a, 1, listed)).containsExactly(hidden, b, a, c);
        assertThat(DocStars.place(stored, a, 9, listed)).containsExactly(hidden, b, c, a);
    }

    @Test
    void movingNeverDuplicates() {
        assertThat(DocStars.place(List.of(a, b, c), a, 2)).containsExactly(b, c, a);
    }

    @Test
    void aTargetIsExactlyOneOfAPageOrACollection() {
        UUID id = UUID.randomUUID();
        assertThatThrownBy(() -> new Target(id, id)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Target(null, null)).isInstanceOf(IllegalArgumentException.class);
        assertThat(Target.page(id).kind()).isEqualTo("page");
        assertThat(Target.collection(id).kind()).isEqualTo("collection");
    }

    @Test
    void theKindDefaultsToPageAndRefusesAnythingElse() {
        assertThat(DocStars.Kind.fromWire(null)).isEqualTo(DocStars.Kind.PAGE);
        assertThat(DocStars.Kind.fromWire("")).isEqualTo(DocStars.Kind.PAGE);
        assertThat(DocStars.Kind.fromWire("collection")).isEqualTo(DocStars.Kind.COLLECTION);
        assertThatThrownBy(() -> DocStars.Kind.fromWire("folder"))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("invalid_star_kind"));
    }
}
