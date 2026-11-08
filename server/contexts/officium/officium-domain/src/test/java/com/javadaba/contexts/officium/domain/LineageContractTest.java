package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1525: where the board asks a corrective card for its lineage, and whom it never asks. */
class LineageContractTest {

    private static final Predicate<String> LIVE = Set.of("JAVA-1420", "JAVA-7")::contains;

    private static final String FULL = """
            Caused by: JAVA-1420
            Escaped in: action
            Quality dimension: clean_code
            Violated rules: clean_code:high-complexity
            """;

    private static void require(ActorKind actor, Executor executor, Category category, Status from, Status to,
            String description) {
        LineageContract.require(actor, executor, category, from, to, description, "JAVA-1500", LIVE);
    }

    @Test
    void aBugWithNoCausedByCannotLeaveRefineAndLegacyLetsItGo() {
        assertThatThrownBy(() -> require(ActorKind.AGENT, Executor.AI, Category.BUG, Status.REFINE, Status.TODO,
                "It breaks."))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> org.assertj.core.api.Assertions.assertThat(ex.code()).isEqualTo("contract_unmet"))
                .hasMessageContaining("bug contract, lineage").hasMessageContaining("Caused by: <KEY>");
        assertThatCode(() -> require(ActorKind.AGENT, Executor.AI, Category.BUG, Status.REFINE, Status.TODO,
                "Caused by: legacy")).doesNotThrowAnyException();
    }

    @Test
    void aNamedOriginNeedsTheOtherThreeLinesAtEveryCheckpoint() {
        for (Status[] move : new Status[][]{{Status.REFINE, Status.DOING}, {Status.DOING, Status.REVIEW},
                {null, Status.TODO}}) {
            assertThatThrownBy(() -> require(ActorKind.AGENT, Executor.AI, Category.REGRESSION, move[0], move[1],
                    "Caused by: JAVA-1420")).hasMessageContaining("Escaped in:");
        }
        assertThatCode(() -> require(ActorKind.AGENT, Executor.AI, Category.HOTFIX, Status.REFINE, Status.TODO,
                FULL)).doesNotThrowAnyException();
    }

    @Test
    void theOriginMustBeAnotherLiveCardOfTheProject() {
        assertThatThrownBy(() -> require(ActorKind.AGENT, Executor.AI, Category.BUG, Status.REFINE, Status.TODO,
                FULL.replace("JAVA-1420", "JAVA-9999"))).hasMessageContaining("JAVA-9999` is not a live card");
        assertThatThrownBy(() -> require(ActorKind.AGENT, Executor.AI, Category.BUG, Status.REFINE, Status.TODO,
                FULL.replace("JAVA-1420", "JAVA-1500"))).hasMessageContaining("names the card itself");
    }

    @Test
    void refactorDebtAndEnhancementStateItOnlyWhenTheyNameAnOrigin() {
        for (Category category : new Category[]{Category.REFACTOR, Category.TECHNICAL_DEBT,
                Category.ENHANCEMENT}) {
            assertThatCode(() -> require(ActorKind.AGENT, Executor.AI, category, Status.REFINE, Status.TODO,
                    "Faster lists.")).doesNotThrowAnyException();
            assertThatThrownBy(() -> require(ActorKind.AGENT, Executor.AI, category, Status.REFINE, Status.TODO,
                    "Caused by: JAVA-7")).hasMessageContaining(category.wire() + " contract, lineage");
        }
    }

    @Test
    void theQuotedLineIsTheOneEachCorrectiveCategorysGuideStates() {
        for (Category category : new Category[]{Category.BUG, Category.REGRESSION, Category.HOTFIX,
                Category.REFACTOR, Category.TECHNICAL_DEBT, Category.ENHANCEMENT}) {
            org.assertj.core.api.Assertions.assertThat(CategoryGuide.of(category).description()
                    .replaceAll("\\s+", " ")).as(category.wire()).contains(LineageContract.LINE);
        }
    }

    @Test
    void neverAPersonAWallAnotherCategoryOrAMoveThatIsNoCheckpoint() {
        assertThatCode(() -> {
            require(ActorKind.PERSON, Executor.AI, Category.BUG, Status.REFINE, Status.TODO, "");
            require(ActorKind.AGENT, Executor.HUMAN, Category.BUG, Status.REFINE, Status.TODO, "");
            require(ActorKind.AGENT, Executor.AI, Category.FEATURE, Status.REFINE, Status.TODO, "");
            require(ActorKind.AGENT, Executor.AI, Category.BUG, Status.TODO, Status.DOING, "");
            require(ActorKind.AGENT, Executor.AI, Category.BUG, Status.REVIEW, Status.DEPLOY, "");
            require(ActorKind.AGENT, Executor.AI, Category.BUG, Status.REVIEW, Status.TODO, "");
            require(ActorKind.AGENT, Executor.AI, Category.BUG, Status.TODO, Status.REFINE, "");
        }).doesNotThrowAnyException();
    }
}
