package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1446: an agent's finishing comment answers the project's standing Definition of Done, item by item. */
class DefinitionOfDoneTest {

    private static final List<String> ITEMS = List.of("Stale documents are fixed", "No junk is left in the tree",
            "Verification is reported");
    private static final Instant NOW = Instant.parse("2026-10-20T10:00:00Z");
    private static final Supplier<List<CardComment>> NEVER_READ = () -> {
        throw new AssertionError("the comments were read");
    };

    private static Card card(Status status, Category category, Executor executor) {
        return new Card(UUID.randomUUID(), UUID.randomUUID(), "OFF-1", 1, "Snake effect", null, null, status,
                RunState.IDLE, Priority.MEDIUM, executor, category, 0, 0, null, List.of(), List.of(), 1, NOW,
                NOW, Actor.agent(UUID.randomUUID(), "claude"), Actor.agent(UUID.randomUUID(), "claude"), null, null,
                null, null, 0, List.of(), null);
    }

    private static Card aiInDoing() {
        return card(Status.DOING, Category.FEATURE, Executor.AI);
    }

    private static CardComment comment(String text) {
        return new CardComment(UUID.randomUUID(), UUID.randomUUID(), Actor.agent(UUID.randomUUID(), "claude"), text,
                NOW.plusSeconds(60), null);
    }

    private static void finish(List<CardComment> comments) {
        DefinitionOfDone.require(ActorKind.AGENT, aiInDoing(), Status.REVIEW, ITEMS, () -> comments);
    }

    /** A finishing comment with the table, one row per given line. */
    private static String table(String... rows) {
        return "Definition of done:\n| item | met / not applicable | evidence or reason |\n|---|---|---|\n"
                + String.join("\n", rows) + "\n";
    }

    @Test
    void anEmptyDefinitionNeverGatesAndNeverReadsComments() {
        assertThatCode(() -> DefinitionOfDone.require(ActorKind.AGENT, aiInDoing(), Status.REVIEW, List.of(),
                NEVER_READ)).doesNotThrowAnyException();
    }

    @Test
    void onlyAnAgentsFinishOfAnAiCardOutOfItsWorkPhaseIsGated() {
        assertThatCode(() -> DefinitionOfDone.require(ActorKind.PERSON, aiInDoing(), Status.REVIEW, ITEMS,
                NEVER_READ)).doesNotThrowAnyException();
        assertThatCode(() -> DefinitionOfDone.require(ActorKind.AGENT,
                card(Status.DOING, Category.FEATURE, Executor.HUMAN), Status.REVIEW, ITEMS, NEVER_READ))
                .doesNotThrowAnyException();
        assertThatCode(() -> DefinitionOfDone.require(ActorKind.AGENT,
                card(Status.DOING, Category.EPIC, Executor.AI), Status.REVIEW, ITEMS, NEVER_READ))
                .doesNotThrowAnyException();
        assertThatCode(() -> DefinitionOfDone.require(ActorKind.AGENT,
                card(Status.REVIEW, Category.FEATURE, Executor.AI), Status.DEPLOY, ITEMS, NEVER_READ))
                .doesNotThrowAnyException();
        assertThatCode(() -> DefinitionOfDone.require(ActorKind.AGENT,
                card(Status.REFINE, Category.FEATURE, Executor.AI), Status.TODO, ITEMS, NEVER_READ))
                .doesNotThrowAnyException();
    }

    @Test
    void noCommentRefusesEveryItem() {
        assertThatThrownBy(() -> finish(List.of(comment("Looks good."))))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("contract_unmet"))
                .hasMessageContaining("1. Stale documents are fixed")
                .hasMessageContaining("3. Verification is reported");
    }

    @Test
    void aPartialTableListsOnlyTheRowsStillMissing() {
        assertThatThrownBy(
                () -> finish(List.of(comment(table("| 1. Stale documents are fixed | met | README rewritten |")))))
                .isInstanceOfSatisfying(OfficiumException.class, ex -> {
                    assertThat(ex.code()).isEqualTo("contract_unmet");
                    assertThat(ex.getMessage()).contains("2. No junk is left in the tree")
                            .contains("3. Verification is reported")
                            .doesNotContain("1. Stale documents");
                });
    }

    @Test
    void aTableAnsweringEveryItemPasses() {
        assertThatCode(() -> finish(List.of(comment(table(
                "| 1. Stale documents are fixed | met | README rewritten |",
                "| 2. No junk is left in the tree | not applicable | no working file created |",
                "| 3. Verification is reported | met | ran the tests |")))))
                .doesNotThrowAnyException();
    }

    @Test
    void notApplicableNeedsAReasonAndNotMetIsWorkLeft() {
        assertThatThrownBy(() -> finish(List.of(comment(table(
                "| 1. Stale documents are fixed | met | README rewritten |",
                "| 2. No junk is left in the tree | not applicable |  |",
                "| 3. Verification is reported | met | ran the tests |")))))
                .isInstanceOfSatisfying(OfficiumException.class, ex -> assertThat(ex.getMessage())
                        .contains("not applicable with no reason").contains("2. No junk is left in the tree"));
        assertThatThrownBy(() -> finish(List.of(comment(table(
                "| 1. Stale documents are fixed | met | README rewritten |",
                "| 2. No junk is left in the tree | not met | a log is still in the tree |",
                "| 3. Verification is reported | met | ran the tests |")))))
                .isInstanceOfSatisfying(OfficiumException.class, ex -> assertThat(ex.getMessage())
                        .contains("marked not met").contains("2. No junk is left in the tree"));
    }

    @Test
    void theItemNumberMayBeWrittenInTheCommonForms() {
        assertThatCode(() -> finish(List.of(comment(table(
                "| 1 | met | README rewritten |",
                "| 2) No junk is left in the tree | met | clean |",
                "| **#3.** Verification is reported | met | ran the tests |")))))
                .doesNotThrowAnyException();
    }

    @Test
    void theLastRowOfAnItemWinsAcrossComments() {
        assertThatCode(() -> finish(List.of(
                comment(table("| 1. Stale documents are fixed | not met | still stale |",
                        "| 2. No junk is left in the tree | met | clean |",
                        "| 3. Verification is reported | met | ran the tests |")),
                comment(table("| 1. Stale documents are fixed | met | fixed |")))))
                .doesNotThrowAnyException();
    }

    @Test
    void aRowForAnUnknownItemIsIgnored() {
        assertThatThrownBy(() -> finish(List.of(comment(table("| 9. Something else | met | x |")))))
                .isInstanceOf(OfficiumException.class)
                .hasMessageContaining("1. Stale documents are fixed")
                .hasMessageContaining("2. No junk is left in the tree")
                .hasMessageContaining("3. Verification is reported");
    }

    @Test
    void aStandingListIsTrimmedAndChecked() {
        assertThat(DefinitionOfDone.valid(List.of("  Stale documents are fixed  "))).containsExactly(
                "Stale documents are fixed");
        assertThatThrownBy(() -> DefinitionOfDone.valid(List.of("   ")))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("definition_of_done_invalid"));
        assertThatThrownBy(() -> DefinitionOfDone.valid(List.of("Docs", "docs")))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("definition_of_done_invalid"));
        assertThatThrownBy(() -> DefinitionOfDone.valid(List.of("x".repeat(201))))
                .isInstanceOf(OfficiumException.class);
        assertThat(DefinitionOfDone.valid(List.of("x".repeat(200)))).hasSize(1);
    }

    @Test
    void theStandingListIsBoundedByTheTokenQuotaNotByItsCount() {
        assertThat(DefinitionOfDone.TOKEN_QUOTA).isEqualTo(WorkRuleTokens.TOKEN_QUOTA);
        List<String> thirtyRules = IntStream.range(0, 30).mapToObj(i -> String.format("%03d", i) + "x".repeat(197))
                .toList();
        assertThat(DefinitionOfDone.valid(thirtyRules)).hasSize(30);
        List<String> thirtyOneRules = new ArrayList<>(thirtyRules);
        thirtyOneRules.add("a");
        assertThatThrownBy(() -> DefinitionOfDone.valid(thirtyOneRules))
                .isInstanceOfSatisfying(OfficiumException.class, ex -> {
                    assertThat(ex.code()).isEqualTo("work_rules_over_quota");
                    assertThat(ex.getMessage()).contains("1501").contains("1500").contains("1 tokens");
                });
    }
}
