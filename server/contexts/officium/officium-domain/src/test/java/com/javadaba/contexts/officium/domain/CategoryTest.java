package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The card categories the user defined on 2026-09-23 (JAVA-28). */
class CategoryTest {

    @ParameterizedTest
    @EnumSource(Category.class)
    void everyCategoryRoundTripsThroughItsWireValue(Category category) {
        assertThat(Category.fromWire(category.wire())).isEqualTo(category);
    }

    @Test
    void theVocabularyIsTheFifteenTheUserListedInTheirOrder() {
        assertThat(Arrays.stream(Category.values()).map(Category::wire)).containsExactly(
                "epic", "feature", "userStory", "enhancement",
                "bug", "hotfix", "regression",
                "refactor", "technicalDebt", "infrastructure", "security",
                "spike", "testing", "routine", "documentation");
    }

    @Test
    void anUnknownCategoryIsTheCallersMistakeAndNamesTheValidOnes() {
        assertThatThrownBy(() -> Category.fromWire("chore"))
                .isInstanceOfSatisfying(OfficiumException.class, ex -> {
                    assertThat(ex.code()).isEqualTo("invalid_category");
                    assertThat(ex.httpStatus()).isEqualTo(400);
                    assertThat(ex.getMessage()).contains("routine");
                });
    }
}
