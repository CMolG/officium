package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** JAVA-393: the routine contract's rules the board enforces, per actor and executor. */
class CategoryContractsTest {

    private static final String WITH_RUNBOOK = "Rotate the keys.\n\nRunbook: ops/prod/README.md#rotating-keys";

    @Test
    void a_routine_card_skips_refine_and_every_other_category_is_born_there() {
        assertThat(CategoryContracts.defaultStatus(Category.ROUTINE, null)).isEqualTo(Status.TODO);
        assertThat(CategoryContracts.defaultStatus(Category.FEATURE, null)).isEqualTo(Status.REFINE);
        assertThat(CategoryContracts.defaultStatus(null, null)).isEqualTo(Status.REFINE);
    }

    @Test
    void an_agents_routine_card_entering_work_without_a_runbook_is_refused() {
        for (Status from : new Status[]{null, Status.REFINE}) {
            for (Status to : new Status[]{Status.TODO, Status.DOING}) {
                assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI,
                        Category.ROUTINE, from, to, "Rotate the keys, see ops/prod/README.md"))
                        .isInstanceOf(OfficiumException.class)
                        .satisfies(ex -> {
                            OfficiumException e = (OfficiumException) ex;
                            assertThat(e.code()).isEqualTo("contract_unmet");
                            assertThat(e.httpStatus()).isEqualTo(409);
                            assertThat(e.getMessage()).contains("routine contract, entry").contains("Runbook:");
                        });
            }
        }
    }

    @Test
    void a_runbook_line_lets_it_in() {
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.ROUTINE, null, Status.TODO,
                WITH_RUNBOOK);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.ROUTINE, Status.REFINE, Status.DOING,
                "- **Runbook:** JAVA-30");
    }

    @Test
    void the_runbook_line_is_a_line_not_a_mention() {
        assertThat(CategoryContracts.namesRunbook("We have no Runbook: yet")).isFalse();
        assertThat(CategoryContracts.namesRunbook("Runbook:")).isFalse();
        // An empty value is not a runbook, whatever the next line says.
        assertThat(CategoryContracts.namesRunbook("Runbook:\n- an unrelated bullet")).isFalse();
        assertThat(CategoryContracts.namesRunbook("Runbook:  \nnext line")).isFalse();
        assertThat(CategoryContracts.namesRunbook(null)).isFalse();
        assertThat(CategoryContracts.namesRunbook("Runbook: https://example.com/runbook")).isTrue();
    }

    @Test
    void entry_never_refuses_a_person_a_wall_another_category_or_a_card_already_past_refine() {
        String none = "no runbook";
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.ROUTINE, null, Status.TODO, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.HUMAN, Category.ROUTINE, null, Status.TODO, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.FEATURE, null, Status.TODO, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.ROUTINE, null, Status.REFINE, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.ROUTINE, Status.TODO, Status.DOING,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.ROUTINE, Status.REVIEW, Status.TODO,
                none);
    }

    @Test
    void an_agents_routine_card_leaving_without_evidence_is_refused() {
        for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
            assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ROUTINE,
                    Status.DOING, to, List::of))
                    .isInstanceOf(OfficiumException.class)
                    .satisfies(ex -> {
                        OfficiumException e = (OfficiumException) ex;
                        assertThat(e.code()).isEqualTo("contract_unmet");
                        assertThat(e.getMessage()).contains("routine contract, exit").contains("cards.comment");
                    });
        }
    }

    @Test
    void evidence_lets_it_out() {
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ROUTINE, Status.DOING, Status.REVIEW,
                () -> List.of(comment(Instant.parse("2026-10-01T11:00:00Z"))));
    }

    @Test
    void exit_never_refuses_a_person_a_wall_another_category_a_reorder_a_move_back_or_a_card_past_its_run() {
        CategoryContracts.requireExit(ActorKind.PERSON, Executor.AI, Category.ROUTINE, Status.DOING, Status.REVIEW,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.HUMAN, Category.ROUTINE, Status.DOING, Status.DONE,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.FEATURE, Status.DOING, Status.REVIEW,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ROUTINE, Status.REVIEW, Status.REVIEW,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ROUTINE, Status.REVIEW, Status.TODO,
                CategoryContractsTest::unexpected);
        // The reviewer's approval and the merge closing the card (GitHub's push is an agent): past the run.
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ROUTINE, Status.REVIEW, Status.DEPLOY,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ROUTINE, Status.DEPLOY, Status.DONE,
                CategoryContractsTest::unexpected);
    }

    @Test
    void the_run_starts_at_the_last_move_into_doing_or_at_creation() {
        UUID card = UUID.randomUUID();
        Instant created = Instant.parse("2026-10-01T08:00:00Z");
        Instant firstDoing = Instant.parse("2026-10-01T09:00:00Z");
        Instant secondDoing = Instant.parse("2026-10-01T11:00:00Z");
        List<DeliveryFlow.Move> moves = List.of(
                new DeliveryFlow.Move(card, Status.DOING, secondDoing, null),
                new DeliveryFlow.Move(card, Status.DOING, firstDoing, null),
                new DeliveryFlow.Move(card, Status.REVIEW, Instant.parse("2026-10-01T12:00:00Z"), null));

        assertThat(CategoryContracts.runStart(created, moves)).isEqualTo(secondDoing);
        assertThat(CategoryContracts.runStart(created, List.of())).isEqualTo(created);
    }

    @Test
    void only_a_comment_from_this_run_counts() {
        Instant start = Instant.parse("2026-10-01T11:00:00Z");
        CardComment before = comment(Instant.parse("2026-10-01T10:59:59Z"));
        CardComment during = comment(start);

        assertThat(CategoryContracts.commentsSince(start, List.of(before))).isEmpty();
        assertThat(CategoryContracts.commentsSince(start, List.of(before, during))).containsExactly(during);
    }

    @Test
    void routines_refusal_is_worded_as_before() {
        assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.ROUTINE, null,
                Status.TODO, "Rotate the keys"))
                .hasMessage("routine contract, entry: \"The runbook it follows, referenced.\" An agent's routine "
                        + "card enters To do or In progress naming its runbook: add a description line `Runbook: "
                        + "<tree path | URL | card key>`. With no runbook yet it is not routine: write the runbook "
                        + "first, as a documentation card, or leave this card in refine.");
    }

    // ── JAVA-388: a technicalDebt card states what it slows down and its cost to enter work ─────

    private static final String SLOWS = "Slows down: every deploy waits on the old image build";
    private static final String COST = "Cost of not paying: 11 minutes of /api downtime per deploy";

    private static void assertDebtRefused(Status from, Status to, String description, String... missing) {
        assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI,
                Category.TECHNICAL_DEBT, from, to, description))
                .isInstanceOfSatisfying(OfficiumException.class, e -> {
                    assertThat(e.code()).isEqualTo("contract_unmet");
                    assertThat(e.httpStatus()).isEqualTo(409);
                    assertThat(e.getMessage()).startsWith("technicalDebt contract, entry:").contains(missing);
                });
    }

    @Test
    void an_agents_technical_debt_card_entering_work_without_its_cost_is_refused() {
        for (Status from : new Status[]{null, Status.REFINE}) {
            for (Status to : new Status[]{Status.TODO, Status.DOING}) {
                assertDebtRefused(from, to, "Upgrade the old driver",
                        "\"What it slows down, or the risk it carries.\"", "`Slows down: ", "`Risk: ",
                        "\"The cost of not paying it.\"", "`Cost of not paying: ");
                assertDebtRefused(from, to, null, "Slows down", "Cost of not paying");
            }
        }
    }

    @Test
    void the_refusal_names_only_the_missing_item() {
        assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI,
                Category.TECHNICAL_DEBT, null, Status.TODO, SLOWS))
                .hasMessageContaining("\"The cost of not paying it.\"")
                .hasMessageNotContaining("What it slows down");
        assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI,
                Category.TECHNICAL_DEBT, null, Status.TODO, COST))
                .hasMessageContaining("\"What it slows down, or the risk it carries.\"")
                .hasMessageNotContaining("The cost of not paying");
    }

    @Test
    void both_lines_let_it_in_as_plain_list_or_bold_lines_and_risk_stands_for_slows_down() {
        for (String description : new String[]{
                SLOWS + "\n" + COST,
                "Context first.\n\n- " + SLOWS + "\n* " + COST,
                "**Risk:** the driver is out of support\n- **Cost of not paying:** no security fixes",
                "  Risk: a CVE nobody patches\n\nCost of not paying: a breach"}) {
            CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.TECHNICAL_DEBT, null, Status.TODO,
                    description);
            CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.TECHNICAL_DEBT, Status.REFINE,
                    Status.DOING, description);
        }
    }

    @Test
    void a_label_is_a_line_with_a_value_not_a_mention() {
        assertDebtRefused(null, Status.TODO, "It has a Risk: big\nAnd a Cost of not paying: high", "Slows down",
                "Cost of not paying");
        assertDebtRefused(null, Status.TODO, "Slows down:\n- something\nCost of not paying:  \nnext",
                "Slows down", "Cost of not paying");
        assertDebtRefused(null, Status.TODO, "slows down: lowercase is not the label\n" + COST, "Slows down");
    }

    @Test
    void technical_debt_entry_never_refuses_a_person_a_wall_refine_or_a_card_already_past_refine() {
        String none = "Upgrade the old driver";
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.TECHNICAL_DEBT, null, Status.TODO,
                none);
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.TECHNICAL_DEBT, Status.REFINE,
                Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.HUMAN, Category.TECHNICAL_DEBT, null, Status.DOING,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.TECHNICAL_DEBT, null, Status.REFINE,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.TECHNICAL_DEBT, Status.TODO,
                Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.TECHNICAL_DEBT, Status.REVIEW,
                Status.TODO, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.TECHNICAL_DEBT, Status.REFINE,
                Status.REVIEW, none);
    }

    @Test
    void a_routine_runbook_does_not_satisfy_technical_debt_nor_its_lines_routine() {
        assertDebtRefused(null, Status.TODO, WITH_RUNBOOK, "Slows down", "Cost of not paying");
        assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.ROUTINE, null,
                Status.TODO, SLOWS + "\n" + COST)).hasMessageContaining("routine contract, entry");
    }

    @Test
    void routines_exit_refusal_is_worded_as_before() {
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ROUTINE,
                Status.DOING, Status.REVIEW, List::of))
                .hasMessage("routine contract, exit: \"Evidence of the execution: the output, the log or the check "
                        + "that shows it ran.\" Comment that evidence on the card (cards.comment), then move it to "
                        + "review again: no comment was posted since it last entered In progress.");
    }

    // ── JAVA-386: a regression names its versions to enter work and its cause to leave it ────────

    private static final String LAST_GOOD = "Last good: fa1da9a5d";
    private static final String FIRST_BAD = "First bad: v2026.09.30";
    private static final String VERSIONS = "The good version and the bad version are identified";

    private static void assertRegressionEntryRefused(Status from, Status to, String description, String... missing) {
        assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REGRESSION,
                from, to, description))
                .isInstanceOfSatisfying(OfficiumException.class, e -> {
                    assertThat(e.code()).isEqualTo("contract_unmet");
                    assertThat(e.httpStatus()).isEqualTo(409);
                    assertThat(e.getMessage()).startsWith("regression contract, entry: \"" + VERSIONS)
                            .contains(missing);
                });
    }

    @Test
    void an_agents_regression_entering_work_without_its_versions_is_refused() {
        for (Status from : new Status[]{null, Status.REFINE}) {
            for (Status to : new Status[]{Status.TODO, Status.DOING}) {
                assertRegressionEntryRefused(from, to, "The export button stopped working", "`Last good: ",
                        "`First bad: ");
                assertRegressionEntryRefused(from, to, null, "Last good", "First bad");
            }
        }
    }

    @Test
    void the_regression_refusal_names_only_the_missing_line_and_quotes_the_contract_once() {
        assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REGRESSION,
                null, Status.TODO, LAST_GOOD))
                .hasMessageContaining("`First bad: ").hasMessageNotContaining("`Last good: ");
        assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REGRESSION,
                null, Status.TODO, FIRST_BAD))
                .hasMessageContaining("`Last good: ").hasMessageNotContaining("`First bad: ");
        assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REGRESSION,
                null, Status.TODO, "none"))
                .satisfies(e -> assertThat(e.getMessage().split(VERSIONS, -1)).hasSize(2));
    }

    @Test
    void both_versions_let_a_regression_in_as_plain_list_or_either_bold_form() {
        for (String description : new String[]{
                LAST_GOOD + "\n" + FIRST_BAD,
                "It used to export.\n\n- " + LAST_GOOD + "\n* " + FIRST_BAD,
                "- **Last good:** fa1da9a5d\n- **First bad:** 0e248ad1d",
                // JAVA-267's own form: the bold closed before the colon.
                "- **Last good**: fa1da9a5d^\n- **First bad**: fa1da9a5d"}) {
            CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REGRESSION, null, Status.TODO,
                    description);
            CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REGRESSION, Status.REFINE,
                    Status.DOING, description);
        }
    }

    @Test
    void the_bold_before_the_colon_form_also_satisfies_the_older_labels() {
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.ROUTINE, null, Status.TODO,
                "- **Runbook**: JAVA-30");
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.TECHNICAL_DEBT, null, Status.TODO,
                "**Risk**: no support\n**Cost of not paying**: no fixes");
        assertThat(CategoryContracts.namesRunbook("**Runbook**:")).isFalse();
    }

    @Test
    void regression_entry_never_refuses_a_person_a_wall_refine_or_a_card_already_past_refine() {
        String none = "The export button stopped working";
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.REGRESSION, null, Status.TODO, none);
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.REGRESSION, Status.REFINE,
                Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.HUMAN, Category.REGRESSION, null, Status.DOING,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REGRESSION, null, Status.REFINE, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REGRESSION, Status.TODO, Status.DOING,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REGRESSION, Status.REVIEW, Status.TODO,
                none);
    }

    private static final Instant RUN = Instant.parse("2026-10-01T11:00:00Z");

    private static void assertRegressionExitRefused(Status to, String... comments) {
        List<CardComment> thisRun = Arrays.stream(comments).map(text -> comment(text, RUN)).toList();
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REGRESSION,
                Status.DOING, to, () -> thisRun))
                .isInstanceOfSatisfying(OfficiumException.class, e -> {
                    assertThat(e.code()).isEqualTo("contract_unmet");
                    assertThat(e.httpStatus()).isEqualTo(409);
                    assertThat(e.getMessage()).startsWith("regression contract, exit:").contains("`Caused by: ")
                            .contains("move it to " + to.wire() + " again");
                });
    }

    @Test
    void an_agents_regression_leaving_work_without_naming_its_cause_is_refused() {
        for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
            assertRegressionExitRefused(to);
            assertRegressionExitRefused(to, "Fixed, and a test pins it.");
            assertRegressionExitRefused(to, "Caused by: unknown", "Caused by:", "Caused by: deadbeef",
                    "Caused by: abc12", "We think it was caused by: fa1da9a5d");
        }
    }

    @Test
    void a_cause_names_a_hash_a_pr_or_a_commit_or_pull_url() {
        for (String cause : new String[]{
                "Caused by: fa1da9a5d",
                "Bisected.\n\n- **Caused by:** 0e248ad1d8c2f1b7a3e4d5c6b7a8f9e0d1c2b3a4 (the refactor)",
                "**Caused by**: #94",
                "Caused by: PR #94, merged on 2026-09-30",
                "Caused by: https://github.com/CMolG/javadaba-webpage/pull/94",
                "Caused by: https://github.com/CMolG/javadaba-webpage/commit/FA1DA9A5D"}) {
            assertThat(CategoryContracts.namesCause(cause)).as(cause).isTrue();
            for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
                CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REGRESSION, Status.DOING, to,
                        () -> List.of(comment("Ran the suite.", RUN), comment(cause, RUN)));
            }
        }
        assertThat(CategoryContracts.namesCause(null)).isFalse();
        assertThat(CategoryContracts.namesCause("Caused by: #94a")).isFalse();
        assertThat(CategoryContracts.namesCause("Caused by: fa1da9a5d1234567890123456789012345678901234")).isFalse();
    }

    @Test
    void a_cause_named_before_the_run_does_not_count() {
        CardComment before = comment("Caused by: fa1da9a5d", Instant.parse("2026-10-01T10:59:59Z"));
        List<CardComment> thisRun = CategoryContracts.commentsSince(RUN, List.of(before, comment("Fixed.", RUN)));
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REGRESSION,
                Status.DOING, Status.REVIEW, () -> thisRun)).hasMessageStartingWith("regression contract, exit:");
    }

    @Test
    void regression_exit_never_refuses_a_person_a_wall_a_reorder_a_move_back_or_a_card_past_its_run() {
        CategoryContracts.requireExit(ActorKind.PERSON, Executor.AI, Category.REGRESSION, Status.DOING, Status.REVIEW,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.HUMAN, Category.REGRESSION, Status.DOING,
                Status.DONE, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REGRESSION, Status.DOING, Status.TODO,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REGRESSION, Status.REVIEW,
                Status.DEPLOY, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REGRESSION, Status.DEPLOY, Status.DONE,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, null, Status.DOING, Status.REVIEW,
                CategoryContractsTest::unexpected);
    }

    @Test
    void the_quoted_regression_lines_are_the_ones_the_guide_states() {
        String guide = CategoryGuide.of(Category.REGRESSION).description().replaceAll("\\s+", " ");
        assertThat(guide).contains("The good version and the bad version are identified: the last one where it "
                + "worked, the first one where it doesn't.")
                .contains("The change that caused it is located: its commit or its PR.");
    }

    @Test
    void regressions_exit_refusal_is_worded_as_before() {
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REGRESSION,
                Status.DOING, Status.REVIEW, List::of))
                .hasMessage("regression contract, exit: \"The change that caused it is located: its commit or its "
                        + "PR.\" Comment it on the card (cards.comment) with a line `Caused by: <commit hash | #PR | "
                        + "commit or pull URL>`, then move it to review again: no comment posted since it last "
                        + "entered In progress names one.");
    }

    // ── JAVA-383: an enhancement leaves its run stating the public contracts it kept ─────────────

    private static final String KEPT = "Existing public contracts are not broken: an API, a wire field, a URL or a "
            + "stored format keeps its shape.";

    private static void assertEnhancementExitRefused(Status from, Status to, String... comments) {
        List<CardComment> thisRun = Arrays.stream(comments).map(text -> comment(text, RUN)).toList();
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ENHANCEMENT,
                from, to, () -> thisRun))
                .isInstanceOfSatisfying(OfficiumException.class, e -> {
                    assertThat(e.code()).isEqualTo("contract_unmet");
                    assertThat(e.httpStatus()).isEqualTo(409);
                    assertThat(e.getMessage()).startsWith("enhancement contract, behavior: \"" + KEPT + "\"")
                            .contains("`Public contracts: ").contains("move it to " + to.wire() + " again");
                });
    }

    @Test
    void an_agents_enhancement_leaving_its_run_without_stating_its_public_contracts_is_refused() {
        for (Status from : new Status[]{Status.REFINE, Status.TODO, Status.DOING, Status.READY}) {
            for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
                assertEnhancementExitRefused(from, to);
                assertEnhancementExitRefused(from, to, "Faster: p95 from 840 ms to 210 ms, measured the same way.");
                assertEnhancementExitRefused(from, to, "Public contracts:", "Public contracts:  \n- the route",
                        "No Public contracts: were touched", "public contracts: none");
            }
        }
    }

    @Test
    void a_public_contracts_line_lets_it_out_as_plain_list_or_either_bold_form() {
        for (String statement : new String[]{
                "Public contracts: none touched",
                "Measured: p95 840 ms -> 210 ms.\n\n- Public contracts: `GET /cards` keeps every field; one added",
                "**Public contracts:** none",
                "* **Public contracts**: the `cards` column is unchanged"}) {
            for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
                CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ENHANCEMENT, Status.DOING, to,
                        () -> List.of(comment("Ran the suite.", RUN), comment(statement, RUN)));
            }
        }
    }

    @Test
    void a_statement_made_before_the_run_does_not_count() {
        CardComment before = comment("Public contracts: none", Instant.parse("2026-10-01T10:59:59Z"));
        List<CardComment> thisRun = CategoryContracts.commentsSince(RUN, List.of(before, comment("Done.", RUN)));
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ENHANCEMENT,
                Status.DOING, Status.REVIEW, () -> thisRun)).hasMessageStartingWith("enhancement contract, behavior:");
    }

    @Test
    void enhancement_exit_never_refuses_a_person_a_wall_a_move_back_or_a_card_past_its_run() {
        CategoryContracts.requireExit(ActorKind.PERSON, Executor.AI, Category.ENHANCEMENT, Status.DOING,
                Status.REVIEW, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.HUMAN, Category.ENHANCEMENT, Status.DOING,
                Status.DONE, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ENHANCEMENT, Status.DOING, Status.TODO,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ENHANCEMENT, Status.REVIEW,
                Status.REVIEW, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ENHANCEMENT, Status.REVIEW,
                Status.DEPLOY, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ENHANCEMENT, Status.DEPLOY, Status.DONE,
                CategoryContractsTest::unexpected);
    }

    @Test
    void a_public_contracts_line_does_not_satisfy_another_categorys_exit_nor_theirs_its() {
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REGRESSION,
                Status.DOING, Status.REVIEW, () -> List.of(comment("Public contracts: none", RUN))))
                .hasMessageStartingWith("regression contract, exit:");
        assertEnhancementExitRefused(Status.DOING, Status.REVIEW, "Caused by: fa1da9a5d", WITH_RUNBOOK);
    }

    @Test
    void the_quoted_enhancement_line_is_the_one_the_guide_states() {
        assertThat(CategoryGuide.of(Category.ENHANCEMENT).description().replaceAll("\\s+", " ")).contains(KEPT);
    }

    @Test
    void enhancements_exit_refusal_is_worded_as_before() {
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.ENHANCEMENT,
                Status.DOING, Status.REVIEW, List::of))
                .hasMessage("enhancement contract, behavior: \"" + KEPT + "\" Comment on the card (cards.comment) "
                        + "a line `Public contracts: <each public surface the change touched and how it keeps its "
                        + "shape, or none>`, then move it to review again: no comment posted since it last entered In "
                        + "progress states them. The board checks the line is there; whether it is true is the "
                        + "reviewer's.");
    }

    // ── JAVA-387: a refactor says why and where it ends to enter work, and its public contracts to leave ─

    private static final String WHY_AND_WHERE = "Why it is restructured, and the structure it ends in.";
    private static final String UNCHANGED = "No public contract changed: the API, the wire formats and the exported "
            + "types are the same.";
    private static final String BECAUSE = "Restructured because: three services copy the same retry loop";
    private static final String ENDS_IN = "Ends in: one `Retry` policy in platform-domain-shared";

    private static void assertRefactorEntryRefused(Status from, Status to, String description, String... missing) {
        assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REFACTOR,
                from, to, description))
                .isInstanceOfSatisfying(OfficiumException.class, e -> {
                    assertThat(e.code()).isEqualTo("contract_unmet");
                    assertThat(e.httpStatus()).isEqualTo(409);
                    assertThat(e.getMessage()).startsWith("refactor contract, entry: \"" + WHY_AND_WHERE + "\"")
                            .contains(missing);
                    assertThat(e.getMessage().split(WHY_AND_WHERE, -1)).hasSize(2);
                });
    }

    @Test
    void an_agents_refactor_entering_work_without_its_why_and_its_end_is_refused() {
        for (Status from : new Status[]{null, Status.REFINE}) {
            for (Status to : new Status[]{Status.TODO, Status.DOING}) {
                assertRefactorEntryRefused(from, to, "Tidy the retry code", "`Restructured because: ", "`Ends in: ");
                assertRefactorEntryRefused(from, to, null, "Restructured because", "Ends in");
            }
        }
    }

    @Test
    void the_refactor_refusal_names_only_the_missing_line() {
        assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REFACTOR, null,
                Status.TODO, BECAUSE))
                .hasMessageContaining("`Ends in: ").hasMessageNotContaining("`Restructured because: ");
        assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REFACTOR, null,
                Status.TODO, ENDS_IN))
                .hasMessageContaining("`Restructured because: ").hasMessageNotContaining("`Ends in: ");
    }

    @Test
    void both_lines_let_a_refactor_in_as_plain_list_or_either_bold_form() {
        for (String description : new String[]{
                BECAUSE + "\n" + ENDS_IN,
                "Context first.\n\n- " + BECAUSE + "\n* " + ENDS_IN,
                "- **Restructured because:** the retry loop is copied\n- **Ends in:** one `Retry` policy",
                "**Restructured because**: the retry loop is copied\n**Ends in**: one `Retry` policy"}) {
            CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REFACTOR, null, Status.TODO,
                    description);
            CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REFACTOR, Status.REFINE,
                    Status.DOING, description);
        }
    }

    @Test
    void a_refactor_label_is_a_line_with_a_value_not_a_mention() {
        assertRefactorEntryRefused(null, Status.TODO, "It was Restructured because: copies\nIt Ends in: one policy",
                "Restructured because", "Ends in");
        assertRefactorEntryRefused(null, Status.TODO, "Restructured because:\n- copies\nEnds in:  \nnext",
                "Restructured because", "Ends in");
        assertRefactorEntryRefused(null, Status.TODO, "ends in: lowercase is not the label\n" + BECAUSE, "Ends in");
    }

    @Test
    void refactor_entry_never_refuses_a_person_a_wall_refine_or_a_card_already_past_refine() {
        String none = "Tidy the retry code";
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.REFACTOR, null, Status.TODO, none);
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.REFACTOR, Status.REFINE, Status.DOING,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.HUMAN, Category.REFACTOR, null, Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REFACTOR, null, Status.REFINE, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REFACTOR, Status.TODO, Status.DOING,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.REFACTOR, Status.REVIEW, Status.TODO,
                none);
    }

    @Test
    void another_categorys_lines_do_not_let_a_refactor_in_nor_its_lines_them() {
        assertRefactorEntryRefused(null, Status.TODO, SLOWS + "\n" + COST + "\n" + WITH_RUNBOOK,
                "Restructured because", "Ends in");
        assertDebtRefused(null, Status.TODO, BECAUSE + "\n" + ENDS_IN, "Slows down", "Cost of not paying");
    }

    private static void assertRefactorExitRefused(Status from, Status to, String... comments) {
        List<CardComment> thisRun = Arrays.stream(comments).map(text -> comment(text, RUN)).toList();
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REFACTOR,
                from, to, () -> thisRun))
                .isInstanceOfSatisfying(OfficiumException.class, e -> {
                    assertThat(e.code()).isEqualTo("contract_unmet");
                    assertThat(e.httpStatus()).isEqualTo(409);
                    assertThat(e.getMessage()).startsWith("refactor contract, exit: \"" + UNCHANGED + "\"")
                            .contains("`Public contracts: ").contains("move it to " + to.wire() + " again");
                });
    }

    @Test
    void an_agents_refactor_leaving_its_run_without_stating_its_public_contracts_is_refused() {
        for (Status from : new Status[]{Status.REFINE, Status.TODO, Status.DOING, Status.READY}) {
            for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
                assertRefactorExitRefused(from, to);
                assertRefactorExitRefused(from, to, "The suites are green and no test was touched.");
                assertRefactorExitRefused(from, to, "Public contracts:", "Public contracts:  \n- the route",
                        "No Public contracts: were touched", "public contracts: none");
            }
        }
    }

    @Test
    void a_public_contracts_line_lets_a_refactor_out_as_plain_list_or_either_bold_form() {
        for (String statement : new String[]{
                "Public contracts: none touched",
                "Suites green.\n\n- Public contracts: `Retry` stays package-private; no route changed",
                "**Public contracts:** none",
                "* **Public contracts**: the `cards` wire shape is unchanged"}) {
            for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
                CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REFACTOR, Status.DOING, to,
                        () -> List.of(comment("Ran the suite.", RUN), comment(statement, RUN)));
            }
        }
    }

    @Test
    void a_refactors_statement_made_before_the_run_does_not_count() {
        CardComment before = comment("Public contracts: none", Instant.parse("2026-10-01T10:59:59Z"));
        List<CardComment> thisRun = CategoryContracts.commentsSince(RUN, List.of(before, comment("Done.", RUN)));
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REFACTOR,
                Status.DOING, Status.REVIEW, () -> thisRun)).hasMessageStartingWith("refactor contract, exit:");
    }

    @Test
    void refactor_exit_never_refuses_a_person_a_wall_a_move_back_or_a_card_past_its_run() {
        CategoryContracts.requireExit(ActorKind.PERSON, Executor.AI, Category.REFACTOR, Status.DOING, Status.REVIEW,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.HUMAN, Category.REFACTOR, Status.DOING, Status.DONE,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REFACTOR, Status.DOING, Status.TODO,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REFACTOR, Status.REVIEW, Status.REVIEW,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REFACTOR, Status.REVIEW, Status.DEPLOY,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REFACTOR, Status.DEPLOY, Status.DONE,
                CategoryContractsTest::unexpected);
    }

    @Test
    void the_refactor_exit_says_whose_the_rest_is() {
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.REFACTOR,
                Status.DOING, Status.REVIEW, List::of))
                .hasMessageEndingWith("The board checks the line is there; whether it is true, and that no existing "
                        + "test was modified, is the reviewer's.");
        assertRefactorExitRefused(Status.DOING, Status.REVIEW, "Caused by: fa1da9a5d", WITH_RUNBOOK, BECAUSE);
    }

    @Test
    void the_quoted_refactor_lines_are_the_ones_the_guide_states() {
        assertThat(CategoryGuide.of(Category.REFACTOR).description().replaceAll("\\s+", " "))
                .contains(WHY_AND_WHERE).contains(UNCHANGED);
    }

    // ── JAVA-384: a bug leaves its run naming its cause and the test that reproduces it ──────────

    private static final String RED_THEN_GREEN = "A test that reproduces the failure, seen red before the fix and "
            + "green after it.";

    private static final String NOT_THE_SYMPTOM = "The cause is fixed, not the symptom.";

    private static final String CAUSE = "Cause: the retry reused the spent idempotency key";

    private static final String REPRODUCED = "Reproduced by: WebhookRetryTest#a_retried_webhook_charges_once";

    private static String bugRefusal(Status from, Status to, String... comments) {
        List<CardComment> thisRun = Arrays.stream(comments).map(text -> comment(text, RUN)).toList();
        try {
            CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.BUG, from, to, () -> thisRun);
        } catch (OfficiumException e) {
            assertThat(e.code()).isEqualTo("contract_unmet");
            assertThat(e.httpStatus()).isEqualTo(409);
            assertThat(e.getMessage()).startsWith("bug contract, exit: \"" + RED_THEN_GREEN + "\" Behavior: \""
                    + NOT_THE_SYMPTOM + "\"").contains("cards.comment").contains("move it to " + to.wire() + " again")
                    .endsWith("The board checks the lines are there; whether they are true is the reviewer's.");
            return e.getMessage();
        }
        throw new AssertionError("a bug left its run with " + Arrays.toString(comments));
    }

    private static void assertBugExitPasses(Status to, String... comments) {
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.BUG, Status.DOING, to,
                () -> Arrays.stream(comments).map(text -> comment(text, RUN)).toList());
    }

    @Test
    void an_agents_bug_leaving_its_run_without_its_cause_and_reproducing_test_is_refused_naming_both() {
        for (Status from : new Status[]{Status.REFINE, Status.TODO, Status.DOING, Status.READY}) {
            for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
                for (String[] comments : new String[][]{{}, {"Fixed: the charge no longer doubles."},
                        {"Cause:", "Reproduced by:  \n- the webhook test"}}) {
                    assertThat(bugRefusal(from, to, comments)).contains("the lines `Cause: ")
                            .contains(" and `Reproduced by: ").contains("has them.");
                }
            }
        }
    }

    @Test
    void the_refusal_names_only_the_missing_line() {
        assertThat(bugRefusal(Status.DOING, Status.REVIEW, CAUSE)).contains("a line `Reproduced by: ")
                .doesNotContain("`Cause: ").contains("has it.");
        assertThat(bugRefusal(Status.DOING, Status.REVIEW, REPRODUCED)).contains("a line `Cause: ")
                .doesNotContain("`Reproduced by: ").contains("has it.");
    }

    @Test
    void a_caused_by_line_is_not_a_cause_nor_an_empty_value_a_line() {
        assertThat(bugRefusal(Status.DOING, Status.REVIEW, "Caused by: fa1da9a5d\n" + REPRODUCED))
                .contains("a line `Cause: ");
        assertThat(bugRefusal(Status.DOING, Status.REVIEW, "Cause:  \n" + REPRODUCED)).contains("a line `Cause: ");
        assertThat(bugRefusal(Status.DOING, Status.REVIEW, CAUSE + "\nReproduced by:")).contains(
                "a line `Reproduced by: ");
        assertThat(bugRefusal(Status.DOING, Status.REVIEW, "The cause: unknown.\n" + REPRODUCED))
                .contains("a line `Cause: ");
    }

    @Test
    void both_lines_let_a_bug_out_in_one_comment_or_two_plain_listed_or_bold() {
        for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
            assertBugExitPasses(to, CAUSE + "\n" + REPRODUCED);
            assertBugExitPasses(to, "Ran the suite.", CAUSE, REPRODUCED);
            assertBugExitPasses(to, "Fixed.\n\n- **Cause:** the retry reused the key\n- **Reproduced by**: "
                    + "`webhook.spec.ts > charges once`");
            assertBugExitPasses(to, "* **Cause**: a stale cache entry", "**Reproduced by:** CacheTest#evicts");
        }
    }

    @Test
    void a_bugs_lines_from_before_the_run_do_not_count() {
        CardComment before = comment(CAUSE + "\n" + REPRODUCED, Instant.parse("2026-10-01T10:59:59Z"));
        List<CardComment> thisRun = CategoryContracts.commentsSince(RUN, List.of(before, comment("Done.", RUN)));
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.BUG,
                Status.DOING, Status.REVIEW, () -> thisRun)).hasMessageStartingWith("bug contract, exit:")
                .hasMessageContaining("the lines `Cause: ");
    }

    @Test
    void bug_exit_never_refuses_a_person_a_wall_a_move_back_or_a_card_past_its_run() {
        CategoryContracts.requireExit(ActorKind.PERSON, Executor.AI, Category.BUG, Status.DOING, Status.REVIEW,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.HUMAN, Category.BUG, Status.DOING, Status.DONE,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.BUG, Status.DOING, Status.TODO,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.BUG, Status.REVIEW, Status.REVIEW,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.BUG, Status.REVIEW, Status.DEPLOY,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.BUG, Status.DEPLOY, Status.DONE,
                CategoryContractsTest::unexpected);
    }

    @Test
    void a_bugs_lines_do_not_let_another_category_out_nor_theirs_a_bug() {
        assertRegressionExitRefused(Status.REVIEW, CAUSE + "\n" + REPRODUCED);
        assertEnhancementExitRefused(Status.DOING, Status.REVIEW, CAUSE + "\n" + REPRODUCED);
        assertThat(bugRefusal(Status.DOING, Status.REVIEW, "Caused by: fa1da9a5d", "Public contracts: none",
                WITH_RUNBOOK)).contains("the lines `Cause: ");
    }

    @Test
    void the_quoted_bug_lines_are_the_ones_the_guide_states() {
        assertThat(CategoryGuide.of(Category.BUG).description().replaceAll("\\s+", " "))
                .contains(RED_THEN_GREEN).contains(NOT_THE_SYMPTOM);
    }

    @Test
    void bugs_full_refusal_is_worded_so() {
        assertThat(bugRefusal(Status.DOING, Status.REVIEW)).isEqualTo("bug contract, exit: \"A test that reproduces "
                + "the failure, seen red before the fix and green after it.\" Behavior: \"The cause is fixed, not the "
                + "symptom.\" Comment on the card (cards.comment) the lines `Cause: <what was wrong, in the code or "
                + "the data, not the symptom>` and `Reproduced by: <the test seen red before the fix and green after "
                + "it>`, then move it to review again: no comment posted since it last entered In progress has them. "
                + "The board checks the lines are there; whether they are true is the reviewer's.");
    }

    // ── JAVA-389: infrastructure states topology, cost and rollback to enter, and its proof to leave ─

    private static final String TOPOLOGY_LINE = "The target topology: what runs where once it is done.";
    private static final String COST_LINE = "Its impact on cost and capacity.";
    private static final String ROLLBACK_LINE = "The rollback plan: how the change is undone.";
    private static final String PROVEN = "The infrastructure is applied as code, and proven by running it (a runnable "
            + "probe comes before any design), not only by reading it.";
    private static final String OBSERVED = "The change's observability is active: a metric, a log or an alert shows "
            + "it working.";
    private static final String TOPOLOGY = "Topology: app-api runs two replicas behind Traefik";
    private static final String CAPACITY = "Cost and capacity: one more 512 MiB container, no new host";
    private static final String ROLLBACK = "Rollback: revert the compose change and redeploy";
    private static final String PROVEN_BY = "Proven by: `docker compose up -d` on staging, both replicas healthy";
    private static final String OBSERVED_BY = "Observed by: the `app_api_up` metric shows two targets";

    private static String infrastructureEntryRefusal(Status from, Status to, String description) {
        try {
            CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.INFRASTRUCTURE, from, to,
                    description);
        } catch (OfficiumException e) {
            assertThat(e.code()).isEqualTo("contract_unmet");
            assertThat(e.httpStatus()).isEqualTo(409);
            assertThat(e.getMessage()).startsWith("infrastructure contract, entry: \"").endsWith("until then it stays "
                    + "in refine.");
            return e.getMessage();
        }
        throw new AssertionError("an infrastructure card entered work with " + description);
    }

    private static void assertInfrastructureEnters(String description) {
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.INFRASTRUCTURE, null, Status.TODO,
                description);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.INFRASTRUCTURE, Status.REFINE,
                Status.DOING, description);
    }

    @Test
    void an_agents_infrastructure_card_entering_work_without_its_three_items_is_refused_naming_each() {
        for (Status from : new Status[]{null, Status.REFINE}) {
            for (Status to : new Status[]{Status.TODO, Status.DOING}) {
                for (String description : new String[]{"Run two app-api replicas", null}) {
                    assertThat(infrastructureEntryRefusal(from, to, description)).contains(TOPOLOGY_LINE, COST_LINE,
                            ROLLBACK_LINE, "`Topology: ", "`Cost and capacity: ", "`Rollback: ");
                }
            }
        }
    }

    @Test
    void the_infrastructure_refusal_names_only_the_missing_items() {
        assertThat(infrastructureEntryRefusal(null, Status.TODO, TOPOLOGY + "\n" + CAPACITY)).contains(ROLLBACK_LINE)
                .doesNotContain(TOPOLOGY_LINE).doesNotContain(COST_LINE);
        assertThat(infrastructureEntryRefusal(null, Status.TODO, ROLLBACK)).contains(TOPOLOGY_LINE, COST_LINE)
                .doesNotContain(ROLLBACK_LINE);
        assertThat(infrastructureEntryRefusal(null, Status.TODO, TOPOLOGY + "\n" + ROLLBACK)).contains(COST_LINE)
                .doesNotContain(TOPOLOGY_LINE).doesNotContain(ROLLBACK_LINE);
    }

    @Test
    void the_three_items_let_it_in_as_plain_list_either_bold_form_or_their_alternative_labels() {
        assertInfrastructureEnters(TOPOLOGY + "\n" + CAPACITY + "\n" + ROLLBACK);
        assertInfrastructureEnters("Context first.\n\n- " + TOPOLOGY + "\n* " + CAPACITY + "\n- " + ROLLBACK);
        assertInfrastructureEnters("- **Target topology:** two replicas\n- **Capacity and cost:** one container\n"
                + "- **Rollback plan:** revert");
        assertInfrastructureEnters("**Topology**: two replicas\n**Cost and capacity**: one container\n**Rollback**: "
                + "revert");
    }

    @Test
    void a_section_with_text_meets_an_item_and_an_empty_one_does_not() {
        // JAVA-742's own shape: the items as sections, with a blank line under each heading.
        assertInfrastructureEnters("## Context\nThe cache grew.\n\n## Target topology\n\nOne cache per slot.\n\n"
                + "## Capacity and cost\n- capped at 10 GB\n\n### Rollback:\nRemove the cap.");
        assertThat(infrastructureEntryRefusal(null, Status.TODO, "## Topology\nTwo replicas.\n\n## Cost and "
                + "capacity\n\n## Rollback\n"))
                .contains(COST_LINE, ROLLBACK_LINE).doesNotContain(TOPOLOGY_LINE);
        assertThat(infrastructureEntryRefusal(null, Status.TODO, TOPOLOGY + "\n" + CAPACITY + "\n## Rollback\n##"))
                .contains(ROLLBACK_LINE);
        // A paragraph lead or a heading that only mentions the label is neither a line nor a section.
        assertThat(infrastructureEntryRefusal(null, Status.TODO, "**Topology.** Two replicas.\n" + CAPACITY + "\n"
                + "## How the rollback works\nRevert it.")).contains(TOPOLOGY_LINE, ROLLBACK_LINE)
                .doesNotContain(COST_LINE);
    }

    @Test
    void a_section_meets_every_other_label_too() {
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.ROUTINE, null, Status.TODO,
                "Rotate the keys.\n\n## Runbook\nops/prod/README.md#rotating-keys");
        assertThat(CategoryContracts.namesRunbook("## Runbook\n\n## Steps\n1. Rotate")).isFalse();
        assertThat(CategoryContracts.namesRunbook("## Runbook")).isFalse();
        assertThatThrownBy(() -> CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.ROUTINE, null,
                Status.TODO, "#Runbook\nops/prod/README.md")).hasMessageStartingWith("routine contract, entry");
    }

    @Test
    void infrastructure_entry_never_refuses_a_person_a_wall_refine_or_a_card_already_past_refine() {
        String none = "Run two app-api replicas";
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.INFRASTRUCTURE, null, Status.TODO,
                none);
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.INFRASTRUCTURE, Status.REFINE,
                Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.HUMAN, Category.INFRASTRUCTURE, null, Status.DOING,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.INFRASTRUCTURE, null, Status.REFINE,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.INFRASTRUCTURE, Status.TODO,
                Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.INFRASTRUCTURE, Status.REVIEW,
                Status.TODO, none);
    }

    private static String infrastructureExitRefusal(Status from, Status to, String... comments) {
        List<CardComment> thisRun = Arrays.stream(comments).map(text -> comment(text, RUN)).toList();
        try {
            CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.INFRASTRUCTURE, from, to,
                    () -> thisRun);
        } catch (OfficiumException e) {
            assertThat(e.code()).isEqualTo("contract_unmet");
            assertThat(e.httpStatus()).isEqualTo(409);
            assertThat(e.getMessage()).startsWith("infrastructure contract, exit: \"" + PROVEN + "\" \"" + OBSERVED
                    + "\"").contains("cards.comment").contains("move it to " + to.wire() + " again")
                    .endsWith("The board checks the lines are there; whether they are true, and that the change is "
                            + "applied as code in the diff, is the reviewer's.");
            return e.getMessage();
        }
        throw new AssertionError("an infrastructure card left its run with " + Arrays.toString(comments));
    }

    private static void assertInfrastructureLeaves(Status to, String... comments) {
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.INFRASTRUCTURE, Status.DOING, to,
                () -> Arrays.stream(comments).map(text -> comment(text, RUN)).toList());
    }

    @Test
    void an_agents_infrastructure_card_leaving_its_run_without_its_proof_and_signal_is_refused_naming_both() {
        for (Status from : new Status[]{Status.REFINE, Status.TODO, Status.DOING, Status.READY}) {
            for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
                for (String[] comments : new String[][]{{}, {"Applied: compose file updated."},
                        {"Proven by:", "Observed by:  \n- the metric"}}) {
                    assertThat(infrastructureExitRefusal(from, to, comments)).contains("the lines `Proven by: ")
                            .contains(" and `Observed by: ").contains("has them.");
                }
            }
        }
    }

    @Test
    void the_infrastructure_exit_refusal_names_only_the_missing_line() {
        assertThat(infrastructureExitRefusal(Status.DOING, Status.REVIEW, PROVEN_BY))
                .contains("a line `Observed by: ").doesNotContain("`Proven by: ").contains("has it.");
        assertThat(infrastructureExitRefusal(Status.DOING, Status.REVIEW, OBSERVED_BY))
                .contains("a line `Proven by: ").doesNotContain("`Observed by: ").contains("has it.");
    }

    @Test
    void both_lines_let_it_out_in_one_comment_or_two_plain_listed_bold_or_as_sections() {
        for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
            assertInfrastructureLeaves(to, PROVEN_BY + "\n" + OBSERVED_BY);
            assertInfrastructureLeaves(to, "Applied.", PROVEN_BY, OBSERVED_BY);
            assertInfrastructureLeaves(to, "- **Proven by:** the deploy run 412\n- **Observed by**: the error-rate "
                    + "alert stayed green");
            assertInfrastructureLeaves(to, "## Proven by\nThe staging deploy.", "## Observed by\n\nThe uptime check.");
        }
    }

    @Test
    void infrastructure_lines_from_before_the_run_do_not_count() {
        CardComment before = comment(PROVEN_BY + "\n" + OBSERVED_BY, Instant.parse("2026-10-01T10:59:59Z"));
        List<CardComment> thisRun = CategoryContracts.commentsSince(RUN, List.of(before, comment("Done.", RUN)));
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.INFRASTRUCTURE,
                Status.DOING, Status.REVIEW, () -> thisRun)).hasMessageStartingWith("infrastructure contract, exit:")
                .hasMessageContaining("the lines `Proven by: ");
    }

    @Test
    void infrastructure_exit_never_refuses_a_person_a_wall_a_move_back_or_a_card_past_its_run() {
        CategoryContracts.requireExit(ActorKind.PERSON, Executor.AI, Category.INFRASTRUCTURE, Status.DOING,
                Status.REVIEW, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.HUMAN, Category.INFRASTRUCTURE, Status.DOING,
                Status.DONE, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.INFRASTRUCTURE, Status.DOING,
                Status.TODO, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.INFRASTRUCTURE, Status.REVIEW,
                Status.REVIEW, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.INFRASTRUCTURE, Status.REVIEW,
                Status.DEPLOY, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.INFRASTRUCTURE, Status.DEPLOY,
                Status.DONE, CategoryContractsTest::unexpected);
    }

    @Test
    void infrastructures_lines_do_not_let_a_bug_out_nor_a_bugs_lines_infrastructure() {
        assertThat(bugRefusal(Status.DOING, Status.REVIEW, PROVEN_BY + "\n" + OBSERVED_BY))
                .contains("the lines `Cause: ");
        assertThat(infrastructureExitRefusal(Status.DOING, Status.REVIEW, CAUSE + "\n" + REPRODUCED,
                "Public contracts: none", WITH_RUNBOOK)).contains("the lines `Proven by: ");
        assertDebtRefused(null, Status.TODO, TOPOLOGY + "\n" + CAPACITY + "\n" + ROLLBACK, "Slows down",
                "Cost of not paying");
    }

    @Test
    void the_quoted_infrastructure_lines_are_the_ones_the_guide_states() {
        assertThat(CategoryGuide.of(Category.INFRASTRUCTURE).description().replaceAll("\\s+", " "))
                .contains(TOPOLOGY_LINE, COST_LINE, ROLLBACK_LINE, PROVEN, OBSERVED);
    }

    @Test
    void infrastructures_full_refusals_are_worded_so() {
        assertThat(infrastructureEntryRefusal(null, Status.TODO, "Run two replicas")).isEqualTo("infrastructure "
                + "contract, entry: \"The target topology: what runs where once it is done.\" Add a description line "
                + "`Topology: <what runs where once it is done>`. \"Its impact on cost and capacity.\" Add a "
                + "description line `Cost and capacity: <its impact on cost and capacity>`. \"The rollback plan: how "
                + "the change is undone.\" Add a description line `Rollback: <how the change is undone>`. A section "
                + "works too: a heading with the label (`## Rollback`) followed by its text. An agent's "
                + "infrastructure card enters To do or In progress with all three; until then it stays in refine.");
        assertThat(infrastructureExitRefusal(Status.DOING, Status.REVIEW)).isEqualTo("infrastructure contract, exit: "
                + "\"" + PROVEN + "\" \"" + OBSERVED + "\" Comment on the card (cards.comment) the lines `Proven by: "
                + "<the command or run that applied it, and what it showed>` and `Observed by: <the metric, log or "
                + "alert that shows it working>`, then move it to review again: no comment posted since it last "
                + "entered In progress has them. The board checks the lines are there; whether they are true, and "
                + "that the change is applied as code in the diff, is the reviewer's.");
    }

    // ── JAVA-381: a feature's, bug's, hotfix's or regression's scope is held past Refine ─────────

    private static final Category[] SCOPE_HELD = {Category.FEATURE, Category.BUG, Category.HOTFIX,
            Category.REGRESSION};

    private static final String CHECKLIST = "Fix the login.\n\n- [ ] It signs in\n* [x] It signs out\n1. [ ] It remembers";

    private static Card card(Category category, Status status, Executor executor, String title, String description,
            String actionPlan) {
        Instant at = Instant.parse("2026-10-02T10:00:00Z");
        Actor agent = Actor.agent(UUID.randomUUID(), "Agent");
        return new Card(UUID.randomUUID(), UUID.randomUUID(), "JAVA-1", 1, title, description, actionPlan, status,
                RunState.IDLE, Priority.MEDIUM, executor, category, 0, 0, null, List.of(), List.of(), 1, at, at, agent,
                agent, null, null, null, null, 0, List.of(), null);
    }

    private static Card card(Category category, Status status) {
        return card(category, status, Executor.AI, "Fix the login", CHECKLIST, null);
    }

    private static Card retitled(Card card, String title) {
        return card(card.category(), card.status(), card.executor(), title, card.description(), card.actionPlan());
    }

    private static Card described(Card card, String description) {
        return card(card.category(), card.status(), card.executor(), card.title(), description, card.actionPlan());
    }

    private static void assertScopeRefused(Card current, Card edited, Category named) {
        assertThatThrownBy(() -> CategoryContracts.requireScopeHeld(ActorKind.AGENT, current, edited))
                .isInstanceOfSatisfying(OfficiumException.class, e -> {
                    assertThat(e.code()).isEqualTo("contract_unmet");
                    assertThat(e.httpStatus()).isEqualTo(409);
                    assertThat(e.getMessage()).contains(named.wire() + " contract, behavior")
                            .contains("cards.move").contains("cards.comment").contains("cards.create");
                });
    }

    @Test
    void an_agents_title_or_description_edit_past_refine_is_refused_in_each_scope_held_category() {
        for (Category category : SCOPE_HELD) {
            for (Status status : new Status[]{Status.TODO, Status.DOING, Status.READY, Status.REVIEW, Status.DEPLOY,
                    Status.DONE}) {
                Card current = card(category, status);
                assertScopeRefused(current, retitled(current, "Fix the login and the signup"), category);
                assertScopeRefused(current, described(current, CHECKLIST + "\n- [ ] And the signup"), category);
            }
        }
    }

    @Test
    void the_refusal_quotes_the_categorys_behavior_line() {
        Card hotfix = card(Category.HOTFIX, Status.DOING);
        assertThatThrownBy(() -> CategoryContracts.requireScopeHeld(ActorKind.AGENT, hotfix,
                retitled(hotfix, "Fix it and refactor it")))
                .hasMessageContaining("No refactoring and no scope growth: the full repair is the follow-up card.");
        Card feature = card(Category.FEATURE, Status.TODO);
        assertThatThrownBy(() -> CategoryContracts.requireScopeHeld(ActorKind.AGENT, feature,
                retitled(feature, "More")))
                .hasMessageContaining("Its scope does not grow without going back to Refine.");
    }

    @Test
    void scope_edits_pass_in_refine_from_a_person_on_a_wall_and_on_any_other_category() {
        for (Category category : SCOPE_HELD) {
            Card refining = card(category, Status.REFINE);
            CategoryContracts.requireScopeHeld(ActorKind.AGENT, refining, retitled(refining, "Wider"));

            Card todo = card(category, Status.TODO);
            CategoryContracts.requireScopeHeld(ActorKind.PERSON, todo, retitled(todo, "Wider"));

            Card wall = card(category, Status.TODO, Executor.HUMAN, "Decide", "Decide it", null);
            CategoryContracts.requireScopeHeld(ActorKind.AGENT, wall, retitled(wall, "Decide more"));
        }
        for (Category category : new Category[]{Category.USER_STORY, Category.REFACTOR, Category.ENHANCEMENT,
                Category.ROUTINE, null}) {
            Card todo = card(category, Status.DOING);
            CategoryContracts.requireScopeHeld(ActorKind.AGENT, todo, described(todo, "Something else entirely"));
        }
    }

    @Test
    void ticking_or_unticking_checklist_boxes_is_progress_not_scope() {
        Card current = card(Category.BUG, Status.DOING);
        CategoryContracts.requireScopeHeld(ActorKind.AGENT, current,
                described(current, "Fix the login.\n\n- [X] It signs in\n* [ ] It signs out\n1. [x] It remembers"));
        // A box's text changing is still scope.
        assertScopeRefused(current, described(current, CHECKLIST.replace("It signs in", "It signs in fast")),
                Category.BUG);
        // A "[x]" that is not a checklist box is text.
        Card prose = card(Category.BUG, Status.DOING, Executor.AI, "Fix", "Press [ ] to close", null);
        assertScopeRefused(prose, described(prose, "Press [x] to close"), Category.BUG);
    }

    @Test
    void the_action_plan_priority_and_category_are_not_scope() {
        Card current = card(Category.FEATURE, Status.DOING);
        CategoryContracts.requireScopeHeld(ActorKind.AGENT, current,
                card(Category.FEATURE, Status.DOING, Executor.AI, current.title(), current.description(),
                        "1. Build it\n2. And the import"));
        CategoryContracts.requireScopeHeld(ActorKind.AGENT, current,
                card(Category.ENHANCEMENT, Status.DOING, Executor.AI, current.title(), current.description(), null));
    }

    @Test
    void recategorizing_in_the_same_call_does_not_step_around_the_gate() {
        Card bug = card(Category.BUG, Status.DOING);
        assertScopeRefused(bug, card(Category.ENHANCEMENT, Status.DOING, Executor.AI, "Wider", bug.description(),
                null), Category.BUG);
        Card enhancement = card(Category.ENHANCEMENT, Status.DOING);
        assertScopeRefused(enhancement, card(Category.FEATURE, Status.DOING, Executor.AI, "Wider",
                enhancement.description(), null), Category.FEATURE);
    }

    // ── JAVA-382: a userStory does not ship while a card blocking it has not ─────────────────────

    private static final String STORY_LINE = "It is delivered end to end, not layer by layer: the user can walk "
            + "the story when it ships.";

    private static final Status[] NOT_SHIPPED = {Status.REFINE, Status.TODO, Status.DOING, Status.READY,
            Status.REVIEW};

    private static final Status[] SHIPPED = {Status.DEPLOY, Status.DONE};

    private static List<CategoryContracts.Blocker> blockers(CategoryContracts.Blocker... blockers) {
        return List.of(blockers);
    }

    private static void storyMove(ActorKind actor, Executor executor, Category category, Status from, Status to,
            List<CategoryContracts.Blocker> blockers) {
        CategoryContracts.requireBlockersShipped(actor, executor, category, from, to, () -> blockers);
    }

    @Test
    void an_agents_story_shipping_while_a_blocker_has_not_is_refused() {
        for (Status from : NOT_SHIPPED) {
            for (Status to : SHIPPED) {
                assertThatThrownBy(() -> storyMove(ActorKind.AGENT, Executor.AI, Category.USER_STORY, from, to,
                        blockers(new CategoryContracts.Blocker("JAVA-2", Status.TODO))))
                        .isInstanceOfSatisfying(OfficiumException.class, e -> {
                            assertThat(e.code()).isEqualTo("contract_unmet");
                            assertThat(e.httpStatus()).isEqualTo(409);
                            assertThat(e.getMessage()).startsWith("userStory contract, behavior: \"" + STORY_LINE
                                    + "\"").contains("move to " + to.wire()).contains("JAVA-2 (todo)")
                                    .contains("cards.unlink").contains("cards.comment");
                        });
            }
        }
    }

    @Test
    void the_refusal_lists_exactly_the_open_blockers() {
        assertThatThrownBy(() -> storyMove(ActorKind.AGENT, Executor.AI, Category.USER_STORY, Status.REVIEW,
                Status.DEPLOY, blockers(new CategoryContracts.Blocker("JAVA-2", Status.REVIEW),
                        new CategoryContracts.Blocker("JAVA-3", Status.DEPLOY),
                        new CategoryContracts.Blocker("JAVA-4", Status.REFINE),
                        new CategoryContracts.Blocker("JAVA-5", Status.DONE))))
                .hasMessageContaining("not shipped: JAVA-2 (review), JAVA-4 (refine).")
                .hasMessageNotContaining("JAVA-3").hasMessageNotContaining("JAVA-5");
    }

    @Test
    void a_story_ships_when_every_blocker_has_or_it_has_none() {
        for (Status from : NOT_SHIPPED) {
            for (Status to : SHIPPED) {
                storyMove(ActorKind.AGENT, Executor.AI, Category.USER_STORY, from, to, blockers());
                storyMove(ActorKind.AGENT, Executor.AI, Category.USER_STORY, from, to,
                        blockers(new CategoryContracts.Blocker("JAVA-2", Status.DEPLOY),
                                new CategoryContracts.Blocker("JAVA-3", Status.DONE)));
            }
        }
    }

    @Test
    void shipping_whole_never_refuses_a_person_a_wall_another_category_review_a_reorder_or_deploy_to_done() {
        List<CategoryContracts.Blocker> open = blockers(new CategoryContracts.Blocker("JAVA-2", Status.TODO));
        Supplier<List<CategoryContracts.Blocker>> unread = () -> {
            throw new AssertionError("blockers read when the gate does not apply");
        };
        for (Status to : SHIPPED) {
            CategoryContracts.requireBlockersShipped(ActorKind.PERSON, Executor.AI, Category.USER_STORY,
                    Status.REVIEW, to, unread);
            CategoryContracts.requireBlockersShipped(ActorKind.AGENT, Executor.HUMAN, Category.USER_STORY,
                    Status.REVIEW, to, unread);
            for (Category category : new Category[]{Category.FEATURE, Category.BUG, Category.ROUTINE,
                    Category.ENHANCEMENT, null}) {
                CategoryContracts.requireBlockersShipped(ActorKind.AGENT, Executor.AI, category, Status.REVIEW, to,
                        unread);
            }
        }
        // The author hands over while a blocker is still in review; the story waits there.
        for (Status from : new Status[]{Status.TODO, Status.DOING, Status.READY}) {
            CategoryContracts.requireBlockersShipped(ActorKind.AGENT, Executor.AI, Category.USER_STORY, from,
                    Status.REVIEW, unread);
        }
        // Moving back is not shipping.
        CategoryContracts.requireBlockersShipped(ActorKind.AGENT, Executor.AI, Category.USER_STORY, Status.DEPLOY,
                Status.TODO, unread);
        // The merge closing what review approved: checked on its way into deploy.
        CategoryContracts.requireBlockersShipped(ActorKind.AGENT, Executor.AI, Category.USER_STORY, Status.DEPLOY,
                Status.DONE, unread);
        // A reorder inside Deploy or Done is not a ship either (CardService only calls on a status change).
        CategoryContracts.requireBlockersShipped(ActorKind.AGENT, Executor.AI, Category.USER_STORY, Status.DEPLOY,
                Status.DEPLOY, unread);
        storyMove(ActorKind.AGENT, Executor.AI, Category.USER_STORY, Status.DOING, Status.DOING, open);
    }

    @Test
    void the_quoted_line_is_the_one_the_guide_states() {
        assertThat(CategoryGuide.of(Category.USER_STORY).description()).contains(STORY_LINE);
    }

    // ── JAVA-385: hotfix's express entry and its linked follow-up ──────────────────────────────────

    private static final String IMPACT_LINE = "Its impact in production is confirmed, not assumed.";
    private static final String VERSION_LINE = "The affected version: what production runs.";
    private static final String REPRO_LINE = "A minimal reproduction.";
    private static final String FOLLOW_UP_LINE = "A follow-up card exists, as a bug or a regression, for the root "
            + "cause and the test that pins it.";
    private static final String IMPACT = "Impact: every sign-in answers 500 since 09:12";
    private static final String VERSION = "Affected version: app-api 2026.10.03-1 (`09629da98`)";
    private static final String REPRO = "Reproduction: POST /account/v1/auth/firebase with any token";
    private static final String HOTFIX_READY = IMPACT + "\n" + VERSION + "\n" + REPRO;

    private static String hotfixEntryRefusal(Status from, Status to, String description) {
        try {
            CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.HOTFIX, from, to, description);
        } catch (OfficiumException e) {
            assertThat(e.code()).isEqualTo("contract_unmet");
            assertThat(e.httpStatus()).isEqualTo(409);
            assertThat(e.getMessage()).startsWith("hotfix contract, entry: \"").endsWith("lands in To do.");
            return e.getMessage();
        }
        throw new AssertionError("a hotfix entered work with " + description);
    }

    private static void assertHotfixEnters(String description) {
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.HOTFIX, null, Status.TODO, description);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.HOTFIX, Status.REFINE, Status.DOING,
                description);
    }

    @Test
    void an_agents_hotfix_entering_work_without_its_three_items_is_refused_naming_each() {
        for (Status from : new Status[]{null, Status.REFINE}) {
            for (Status to : new Status[]{Status.TODO, Status.DOING}) {
                for (String description : new String[]{"Sign-in is down", null}) {
                    assertThat(hotfixEntryRefusal(from, to, description)).contains(IMPACT_LINE, VERSION_LINE,
                            REPRO_LINE, "`Impact: ", "`Affected version: ", "`Reproduction: ");
                }
            }
        }
    }

    @Test
    void the_hotfix_refusal_names_only_the_missing_items() {
        assertThat(hotfixEntryRefusal(null, Status.TODO, IMPACT + "\n" + VERSION)).contains(REPRO_LINE)
                .doesNotContain(IMPACT_LINE).doesNotContain(VERSION_LINE);
        assertThat(hotfixEntryRefusal(null, Status.TODO, REPRO)).contains(IMPACT_LINE, VERSION_LINE)
                .doesNotContain(REPRO_LINE);
    }

    @Test
    void the_three_items_let_a_hotfix_in_as_plain_list_bold_or_section_lines_and_with_any_reproduction_label() {
        assertHotfixEnters(HOTFIX_READY);
        assertHotfixEnters("Sign-in is down.\n\n- " + IMPACT + "\n* " + VERSION + "\n- " + REPRO);
        assertHotfixEnters("**Impact:** all sign-ins\n**Affected version**: 2026.10.03-1\n- **Repro:** sign in");
        assertHotfixEnters(IMPACT + "\n" + VERSION + "\nSteps to reproduce: sign in");
        assertHotfixEnters("## Impact\nAll sign-ins fail.\n\n## Affected version\n\n2026.10.03-1\n\n"
                + "## Reproduction\n1. Sign in.");
        // A heading or a sentence that only mentions a label is not the item.
        assertThat(hotfixEntryRefusal(null, Status.TODO, IMPACT + "\n" + VERSION + "\nWe have no reproduction: yet"))
                .contains(REPRO_LINE);
    }

    @Test
    void hotfix_entry_never_refuses_a_person_a_wall_refine_or_a_card_already_past_refine() {
        String none = "Sign-in is down";
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.HOTFIX, null, Status.TODO, none);
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.HOTFIX, Status.REFINE, Status.DOING,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.HUMAN, Category.HOTFIX, null, Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.HOTFIX, null, Status.REFINE, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.HOTFIX, Status.TODO, Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.HOTFIX, Status.REVIEW, Status.TODO,
                none);
    }

    @Test
    void a_hotfix_meeting_its_entry_skips_refine_and_one_that_does_not_is_born_there() {
        assertThat(CategoryContracts.defaultStatus(Category.HOTFIX, HOTFIX_READY)).isEqualTo(Status.TODO);
        assertThat(CategoryContracts.defaultStatus(Category.HOTFIX, "## Impact\nAll sign-ins.\n" + VERSION + "\n"
                + "Repro: sign in")).isEqualTo(Status.TODO);
        assertThat(CategoryContracts.defaultStatus(Category.HOTFIX, IMPACT + "\n" + VERSION)).isEqualTo(Status.REFINE);
        assertThat(CategoryContracts.defaultStatus(Category.HOTFIX, null)).isEqualTo(Status.REFINE);
        // The lines move no other category out of Refine, and routine needs none.
        assertThat(CategoryContracts.defaultStatus(Category.BUG, HOTFIX_READY)).isEqualTo(Status.REFINE);
        assertThat(CategoryContracts.defaultStatus(Category.ROUTINE, "no runbook")).isEqualTo(Status.TODO);
    }

    @Test
    void the_hotfix_refusal_is_worded_so() {
        assertThat(hotfixEntryRefusal(null, Status.TODO, "Sign-in is down")).isEqualTo("hotfix contract, entry: \""
                + IMPACT_LINE + "\" Add a description line `Impact: <the confirmed impact in production>`. \""
                + VERSION_LINE + "\" Add a description line `Affected version: <the commit, tag or release production "
                + "runs>`. \"" + REPRO_LINE + "\" Add a description line `Reproduction: <the minimal steps that show "
                + "it>` (or `Repro:`, `Steps to reproduce:`). A section works too: a heading with the label "
                + "(`## Reproduction`) followed by its text. Its refine is express: an agent's hotfix enters To do or "
                + "In progress with all three, and one created with them and no status lands in To do.");
    }

    private static String followUpRefusal(Status from, Status to, Category... linked) {
        try {
            CategoryContracts.requireFollowUp(ActorKind.AGENT, Executor.AI, Category.HOTFIX, from, to,
                    () -> Arrays.asList(linked));
        } catch (OfficiumException e) {
            assertThat(e.code()).isEqualTo("contract_unmet");
            assertThat(e.httpStatus()).isEqualTo(409);
            return e.getMessage();
        }
        throw new AssertionError("a hotfix left its run linked to " + Arrays.toString(linked));
    }

    @Test
    void an_agents_hotfix_leaving_its_run_without_a_linked_bug_or_regression_is_refused() {
        for (Status from : new Status[]{Status.REFINE, Status.TODO, Status.DOING, Status.READY}) {
            for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
                assertThat(followUpRefusal(from, to)).isEqualTo("hotfix contract, exit: \"" + FOLLOW_UP_LINE
                        + "\" Create it (cards.create with category bug or regression and related: [<this hotfix's "
                        + "key>]) or link the one that exists (cards.link), then move it to " + to.wire() + " again: "
                        + "no bug or regression card is linked to it.");
                // Another category, or a card with none, is not a follow-up.
                assertThat(followUpRefusal(from, to, Category.FEATURE, Category.HOTFIX, null))
                        .startsWith("hotfix contract, exit:");
            }
        }
    }

    @Test
    void a_linked_bug_or_regression_lets_a_hotfix_out() {
        for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
            CategoryContracts.requireFollowUp(ActorKind.AGENT, Executor.AI, Category.HOTFIX, Status.DOING, to,
                    () -> List.of(Category.BUG));
            CategoryContracts.requireFollowUp(ActorKind.AGENT, Executor.AI, Category.HOTFIX, Status.DOING, to,
                    () -> Arrays.asList(null, Category.FEATURE, Category.REGRESSION));
        }
    }

    @Test
    void follow_up_never_refuses_a_person_a_wall_another_category_a_move_back_or_a_card_past_its_run() {
        Supplier<List<Category>> unread = () -> {
            throw new AssertionError("links read when the gate does not apply");
        };
        CategoryContracts.requireFollowUp(ActorKind.PERSON, Executor.AI, Category.HOTFIX, Status.DOING, Status.REVIEW,
                unread);
        CategoryContracts.requireFollowUp(ActorKind.AGENT, Executor.HUMAN, Category.HOTFIX, Status.DOING, Status.DONE,
                unread);
        CategoryContracts.requireFollowUp(ActorKind.AGENT, Executor.AI, Category.BUG, Status.DOING, Status.REVIEW,
                unread);
        CategoryContracts.requireFollowUp(ActorKind.AGENT, Executor.AI, null, Status.DOING, Status.REVIEW, unread);
        CategoryContracts.requireFollowUp(ActorKind.AGENT, Executor.AI, Category.HOTFIX, Status.DOING, Status.TODO,
                unread);
        CategoryContracts.requireFollowUp(ActorKind.AGENT, Executor.AI, Category.HOTFIX, Status.REVIEW,
                Status.DEPLOY, unread);
        CategoryContracts.requireFollowUp(ActorKind.AGENT, Executor.AI, Category.HOTFIX, Status.DEPLOY, Status.DONE,
                unread);
    }

    @Test
    void the_quoted_hotfix_lines_are_the_ones_the_guide_states() {
        assertThat(CategoryGuide.of(Category.HOTFIX).description().replaceAll("\\s+", " "))
                .contains(IMPACT_LINE, VERSION_LINE, REPRO_LINE, FOLLOW_UP_LINE);
    }

    // ── spike: question, time box and success criterion to enter, and the box's deadline (JAVA-878) ─────────────

    private static final String QUESTION_LINE = "A concrete question.";
    private static final String TIME_BOX_LINE = "A time box.";
    private static final String CRITERION_LINE = "A success criterion: the answer that closes the question.";
    private static final String DELIVERED_LINE = "When the time box runs out, whatever exists is delivered.";
    private static final String QUESTION = "Question: can the board read a spike's time box from its description?";
    private static final String TIME_BOX = "Time box: 4h";
    private static final String CRITERION = "Success criterion: a parser that reads every form, or the forms it cannot";
    private static final String SPIKE_READY = QUESTION + "\n" + TIME_BOX + "\n" + CRITERION;
    private static final String UNPARSED = "The `Time box:` value is not a duration";

    private static String spikeEntryRefusal(Status from, Status to, String description) {
        try {
            CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.SPIKE, from, to, description);
        } catch (OfficiumException e) {
            assertThat(e.code()).isEqualTo("contract_unmet");
            assertThat(e.httpStatus()).isEqualTo(409);
            assertThat(e.getMessage()).startsWith("spike contract, entry: \"").endsWith("with what exists.");
            return e.getMessage();
        }
        throw new AssertionError("a spike entered work with " + description);
    }

    private static void assertSpikeEnters(String description) {
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.SPIKE, null, Status.TODO, description);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.SPIKE, Status.REFINE, Status.DOING,
                description);
    }

    @Test
    void an_agents_spike_entering_work_without_its_three_items_is_refused_naming_each() {
        for (Status from : new Status[]{null, Status.REFINE}) {
            for (Status to : new Status[]{Status.TODO, Status.DOING}) {
                for (String description : new String[]{"Find out whether it can be read", null}) {
                    assertThat(spikeEntryRefusal(from, to, description)).contains(QUESTION_LINE, TIME_BOX_LINE,
                            CRITERION_LINE, "`Question: ", "`Time box: <n>h`", "`Success criterion: ");
                }
            }
        }
    }

    @Test
    void the_spike_refusal_names_only_the_missing_items() {
        assertThat(spikeEntryRefusal(null, Status.TODO, QUESTION + "\n" + TIME_BOX)).contains(CRITERION_LINE)
                .doesNotContain(QUESTION_LINE).doesNotContain(TIME_BOX_LINE);
        assertThat(spikeEntryRefusal(null, Status.TODO, TIME_BOX)).contains(QUESTION_LINE, CRITERION_LINE)
                .doesNotContain(TIME_BOX_LINE);
        assertThat(spikeEntryRefusal(Status.REFINE, Status.DOING, QUESTION + "\n" + CRITERION)).contains(TIME_BOX_LINE)
                .doesNotContain(QUESTION_LINE).doesNotContain(CRITERION_LINE).doesNotContain(UNPARSED);
    }

    @Test
    void a_time_box_that_is_not_a_duration_is_refused_giving_the_format() {
        for (String box : new String[]{"Time box: soon", "Time box: 0h", "Time box: a week", "Time box: h4",
                "## Time box\n\nAbout half a day"}) {
            String refusal = spikeEntryRefusal(null, Status.DOING, QUESTION + "\n" + box + "\n" + CRITERION);
            assertThat(refusal).contains(TIME_BOX_LINE, UNPARSED, "`<n>h` or `<n>d`", "`Time box: 4h`")
                    .doesNotContain(QUESTION_LINE).doesNotContain(CRITERION_LINE);
        }
        // An unusable value and a missing item are named together, each once.
        assertThat(spikeEntryRefusal(null, Status.TODO, "Time box: soon")).contains(QUESTION_LINE, UNPARSED,
                CRITERION_LINE);
    }

    @Test
    void the_three_items_let_a_spike_in_as_plain_list_bold_or_section_lines_and_with_either_criterion_label() {
        assertSpikeEnters(SPIKE_READY);
        assertSpikeEnters("Research.\n\n- " + QUESTION + "\n* " + TIME_BOX + "\n- " + CRITERION);
        assertSpikeEnters(
                "**Question:** which parser?\n**Time box**: 2 days\n- **Answer that closes it:** a yes or a no");
        assertSpikeEnters("## Question\nWhich parser?\n\n## Time box\n\n1d\n\n## Success criterion\nA yes or a no.");
        // A sentence that only mentions a label is not the item.
        assertThat(spikeEntryRefusal(null, Status.TODO, QUESTION + "\n" + TIME_BOX + "\nWe have no success criterion: "
                + "yet")).contains(CRITERION_LINE);
    }

    @Test
    void spike_entry_never_refuses_a_person_a_wall_refine_or_a_card_already_past_refine() {
        String none = "Find out whether it can be read";
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.SPIKE, null, Status.TODO, none);
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.SPIKE, Status.REFINE, Status.DOING,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.HUMAN, Category.SPIKE, null, Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.SPIKE, null, Status.REFINE, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.SPIKE, Status.TODO, Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.SPIKE, Status.READY, Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.SPIKE, Status.REVIEW, Status.TODO, none);
    }

    @Test
    void the_spike_refusal_is_worded_so() {
        assertThat(spikeEntryRefusal(null, Status.TODO, "Find out")).isEqualTo("spike contract, entry: \""
                + QUESTION_LINE + "\" Add a description line `Question: <the concrete question it answers>`. \""
                + TIME_BOX_LINE + "\" Add a description line `Time box: <n>h` or `Time box: <n>d` (also `hours`, "
                + "`days`): how long it may run, counted from its last move into In progress. \"" + CRITERION_LINE
                + "\" Add a description line `Success criterion: <the answer that closes the question>` (or `Answer "
                + "that closes it:`). A section works too: a heading with the label (`## Question`) followed by its "
                + "text. An agent's spike enters To do or In progress with all three; until then it stays in refine. "
                + "Once In progress, when its time box runs out the board moves it to ready with what exists.");
        assertThat(spikeEntryRefusal(null, Status.TODO, QUESTION + "\nTime box: soon\n" + CRITERION))
                .isEqualTo("spike contract, entry: \"" + TIME_BOX_LINE + "\" The `Time box:` value is not a "
                        + "duration: write a whole number of hours or days, at least 1, as `<n>h` or `<n>d` (also "
                        + "`hours`, `days`), e.g. `Time box: 4h`. A section works too: a heading with the label "
                        + "(`## Question`) followed by its text. An agent's spike enters To do or In progress with all "
                        + "three; until then it stays in refine. Once In progress, when its time box runs out the "
                        + "board moves it to ready with what exists.");
    }

    @Test
    void the_quoted_spike_lines_are_the_ones_the_guide_states() {
        assertThat(CategoryGuide.of(Category.SPIKE).description().replaceAll("\\s+", " "))
                .contains(QUESTION_LINE, TIME_BOX_LINE, CRITERION_LINE, DELIVERED_LINE);
    }

    @Test
    void the_time_box_reads_a_whole_number_of_hours_or_days() {
        assertThat(CategoryContracts.timeBox("Time box: 4h")).contains(Duration.ofHours(4));
        assertThat(CategoryContracts.timeBox("Time box: 2 days")).contains(Duration.ofDays(2));
        assertThat(CategoryContracts.timeBox("- **Time box:** 1d")).contains(Duration.ofDays(1));
        assertThat(CategoryContracts.timeBox("Time box: 1 hour, one session")).contains(Duration.ofHours(1));
        assertThat(CategoryContracts.timeBox("Time box: `6H`")).contains(Duration.ofHours(6));
        assertThat(CategoryContracts.timeBox("## Time box\n\n3 days\n")).contains(Duration.ofDays(3));
        // The first line is the box, whatever a later one says.
        assertThat(CategoryContracts.timeBox("Time box: 2h\nTime box: 9d")).contains(Duration.ofHours(2));
        for (String none : new String[]{"Time box: 0h", "Time box: soon", "Time box: 4 weeks", "Time box: 4hrs",
                "Time box:", "Time box:\n4h", "We have no time box: yet", "time box: 4h", "Timebox: 4h", ""}) {
            assertThat(CategoryContracts.timeBox(none)).as(none).isEmpty();
        }
        assertThat(CategoryContracts.timeBox(null)).isEmpty();
    }

    private static final Instant CREATED = Instant.parse("2026-10-02T10:00:00Z");

    private static DeliveryFlow.Move moveTo(Card card, Status to, Instant at) {
        return new DeliveryFlow.Move(card.id(), to, at, Actor.agent(UUID.randomUUID(), "Agent"));
    }

    @Test
    void a_spikes_box_runs_from_its_last_move_into_in_progress() {
        Card spike = card(Category.SPIKE, Status.DOING, Executor.AI, "Research", SPIKE_READY, null);
        Instant started = CREATED.plusSeconds(3600);
        Instant restarted = CREATED.plusSeconds(86_400);

        assertThat(CategoryContracts.timeBoxEndsAt(spike, List::of)).contains(CREATED.plus(Duration.ofHours(4)));
        assertThat(CategoryContracts.timeBoxEndsAt(spike, () -> List.of(moveTo(spike, Status.TODO, CREATED),
                moveTo(spike, Status.DOING, started)))).contains(started.plus(Duration.ofHours(4)));
        // Sent back from Ready and started again: a new box.
        assertThat(CategoryContracts.timeBoxEndsAt(spike, () -> List.of(moveTo(spike, Status.DOING, started),
                moveTo(spike, Status.READY, started.plusSeconds(4 * 3600)), moveTo(spike, Status.DOING, restarted))))
                .contains(restarted.plus(Duration.ofHours(4)));
    }

    @Test
    void only_an_agents_spike_in_progress_with_a_box_has_a_deadline() {
        Supplier<List<DeliveryFlow.Move>> unread = () -> {
            throw new AssertionError("moves read for a card with no box running");
        };
        assertThat(CategoryContracts.timeBoxEndsAt(card(Category.SPIKE, Status.TODO, Executor.AI, "R", SPIKE_READY,
                null), unread)).isEmpty();
        assertThat(CategoryContracts.timeBoxEndsAt(card(Category.SPIKE, Status.READY, Executor.AI, "R", SPIKE_READY,
                null), unread)).isEmpty();
        assertThat(CategoryContracts.timeBoxEndsAt(card(Category.SPIKE, Status.DOING, Executor.HUMAN, "R", SPIKE_READY,
                null), unread)).isEmpty();
        assertThat(CategoryContracts.timeBoxEndsAt(card(Category.FEATURE, Status.DOING, Executor.AI, "R", SPIKE_READY,
                null), unread)).isEmpty();
        assertThat(CategoryContracts.timeBoxEndsAt(card(Category.SPIKE, Status.DOING, Executor.AI, "R",
                QUESTION + "\nTime box: soon", null), unread)).isEmpty();
        assertThat(CategoryContracts.timeBoxEndsAt(card(null, Status.DOING, Executor.AI, "R", SPIKE_READY, null),
                unread)).isEmpty();
    }

    @Test
    void the_delivery_comment_says_when_the_box_started_how_long_it_was_and_when_it_ended() {
        Instant ends = Instant.parse("2026-10-03T09:00:00Z");
        assertThat(CategoryContracts.timeBoxDelivered(ends, Duration.ofHours(4))).isEqualTo("Time box ended: 4 hours "
                + "from 2026-10-03T05:00:00Z (its last move into In progress) to 2026-10-03T09:00:00Z. Moved to "
                + "ready: delivered with what exists: the delivery analyst checks it against the exit contract.");
        assertThat(CategoryContracts.timeBoxDelivered(ends, Duration.ofDays(1))).startsWith("Time box ended: 1 day "
                + "from 2026-10-02T09:00:00Z");
        assertThat(CategoryContracts.timeBoxDelivered(ends, Duration.ofHours(1))).startsWith("Time box ended: 1 hour ");
    }

    // ── JAVA-392: a testing card says what it covers and leaves out to enter, and names its gate run to leave ──

    private static final String COVERAGE_LINE = "What gets covered, and why, and what is left out.";
    private static final String GREEN_LINE = "The tests are green and deterministic, the same result on every run, in "
            + "the project's gate: CI, or the local attestation where CI does not run the tests.";
    private static final String COVERS = "Covers: the refund path, because it has no e2e";
    private static final String LEFT_OUT = "Left out: partial refunds, a card of their own";
    private static final String GATE = "Gate: local attestation 786b40e6b, 39/39 suites green";

    private static String testingEntryRefusal(Status from, Status to, String description) {
        try {
            CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.TESTING, from, to, description);
        } catch (OfficiumException e) {
            assertThat(e.code()).isEqualTo("contract_unmet");
            assertThat(e.httpStatus()).isEqualTo(409);
            assertThat(e.getMessage()).startsWith("testing contract, entry: \"" + COVERAGE_LINE + "\"")
                    .endsWith("until then it stays in refine.");
            assertThat(e.getMessage().split(COVERAGE_LINE, -1)).hasSize(2);
            return e.getMessage();
        }
        throw new AssertionError("a testing card entered work with " + description);
    }

    private static void assertTestingEnters(String description) {
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.TESTING, null, Status.TODO, description);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.TESTING, Status.REFINE, Status.DOING,
                description);
    }

    @Test
    void an_agents_testing_card_entering_work_without_its_coverage_is_refused_naming_both_lines() {
        for (Status from : new Status[]{null, Status.REFINE}) {
            for (Status to : new Status[]{Status.TODO, Status.DOING}) {
                for (String description : new String[]{"Add the refund e2e", null}) {
                    assertThat(testingEntryRefusal(from, to, description)).contains("`Covers: ", "`Left out: ");
                }
            }
        }
    }

    @Test
    void the_testing_entry_refusal_names_only_the_missing_line() {
        assertThat(testingEntryRefusal(null, Status.TODO, COVERS)).contains("`Left out: ").doesNotContain("`Covers: ");
        assertThat(testingEntryRefusal(null, Status.TODO, LEFT_OUT)).contains("`Covers: ")
                .doesNotContain("`Left out: ");
    }

    @Test
    void both_lines_let_a_testing_card_in_plain_listed_bold_or_as_sections() {
        for (String description : new String[]{
                COVERS + "\n" + LEFT_OUT,
                "Context first.\n\n- " + COVERS + "\n* " + LEFT_OUT,
                "- **Covers:** the refund path\n- **Left out:** partial refunds",
                "**Covers**: the refund path\n**Left out**: partial refunds",
                "What gets covered: the refund path\nLeft out: partial refunds",
                "What gets covered, and why: the refund path, it has no e2e\nLeft out: partial refunds",
                // The shape epic test cards already use (JAVA-876).
                "## What gets covered, and why\nEvery suite of the catalog.\n\n**Left out:** the ux suite",
                "## Covers\n\nThe refund path.\n\n## Left out\nPartial refunds."}) {
            assertTestingEnters(description);
        }
    }

    @Test
    void a_testing_label_is_a_line_with_a_value_not_a_mention() {
        assertThat(testingEntryRefusal(null, Status.TODO, "It Covers: refunds\nWhat is Left out: partials"))
                .contains("`Covers: ", "`Left out: ");
        assertThat(testingEntryRefusal(null, Status.TODO, "Covers:\n- refunds\nLeft out:  \nnext"))
                .contains("`Covers: ", "`Left out: ");
        assertThat(testingEntryRefusal(null, Status.TODO, "left out: lowercase is not the label\n" + COVERS))
                .contains("`Left out: ").doesNotContain("`Covers: ");
        assertThat(testingEntryRefusal(null, Status.TODO, "## What gets covered, and why\n## Left out\nPartials."))
                .contains("`Covers: ").doesNotContain("`Left out: ");
    }

    @Test
    void testing_entry_never_refuses_a_person_a_wall_refine_or_a_card_already_past_refine() {
        String none = "Add the refund e2e";
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.TESTING, null, Status.TODO, none);
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.TESTING, Status.REFINE, Status.DOING,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.HUMAN, Category.TESTING, null, Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.HUMAN, Category.TESTING, Status.REFINE, Status.TODO,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.TESTING, null, Status.REFINE, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.TESTING, Status.TODO, Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.TESTING, Status.REVIEW, Status.TODO,
                none);
    }

    @Test
    void another_categorys_lines_do_not_let_a_testing_card_in_nor_its_lines_them() {
        assertThat(testingEntryRefusal(null, Status.TODO, BECAUSE + "\n" + ENDS_IN + "\n" + SLOWS + "\n" + COST
                + "\n" + WITH_RUNBOOK)).contains("`Covers: ", "`Left out: ");
        assertRefactorEntryRefused(null, Status.TODO, COVERS + "\n" + LEFT_OUT, "Restructured because", "Ends in");
        assertDebtRefused(null, Status.TODO, COVERS + "\n" + LEFT_OUT, "Slows down", "Cost of not paying");
    }

    private static String testingExitRefusal(Status from, Status to, String... comments) {
        List<CardComment> thisRun = Arrays.stream(comments).map(text -> comment(text, RUN)).toList();
        try {
            CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.TESTING, from, to, () -> thisRun);
        } catch (OfficiumException e) {
            assertThat(e.code()).isEqualTo("contract_unmet");
            assertThat(e.httpStatus()).isEqualTo(409);
            assertThat(e.getMessage()).startsWith("testing contract, exit: \"" + GREEN_LINE + "\"")
                    .contains("a line `Gate: ").contains("move it to " + to.wire() + " again").contains("has it.");
            return e.getMessage();
        }
        throw new AssertionError("a testing card left its run with " + Arrays.toString(comments));
    }

    @Test
    void an_agents_testing_card_leaving_its_run_without_a_gate_line_is_refused() {
        for (Status from : new Status[]{Status.REFINE, Status.TODO, Status.DOING, Status.READY}) {
            for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
                for (String[] comments : new String[][]{{}, {"Ran the suite: green."}, {"Gate:"},
                        {"Gate:  \n- the attestation"}, {"The Gate: was green"}, {"gate: lowercase"}}) {
                    testingExitRefusal(from, to, comments);
                }
            }
        }
    }

    @Test
    void a_gate_line_lets_it_out_plain_listed_bold_or_as_a_section() {
        for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
            for (String[] comments : new String[][]{{GATE}, {"Done.", GATE}, {"Done.\n\n- " + GATE},
                    {"- **Gate:** `api` suite, 412 tests green"}, {"**Gate**: the attestation, green"},
                    {"## Gate\n\nThe fabula-e2e run, 3 times green; global suites: JAVA-369."}}) {
                CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.TESTING, Status.DOING, to,
                        () -> Arrays.stream(comments).map(text -> comment(text, RUN)).toList());
            }
        }
    }

    @Test
    void a_gate_line_from_before_the_run_does_not_count() {
        CardComment before = comment(GATE, Instant.parse("2026-10-01T10:59:59Z"));
        List<CardComment> thisRun = CategoryContracts.commentsSince(RUN, List.of(before, comment("Done.", RUN)));
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.TESTING,
                Status.DOING, Status.REVIEW, () -> thisRun)).hasMessageStartingWith("testing contract, exit:")
                .hasMessageContaining("a line `Gate: ");
    }

    @Test
    void testing_exit_never_refuses_a_person_a_wall_a_move_back_or_a_card_past_its_run() {
        CategoryContracts.requireExit(ActorKind.PERSON, Executor.AI, Category.TESTING, Status.DOING, Status.REVIEW,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.HUMAN, Category.TESTING, Status.DOING, Status.DONE,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.TESTING, Status.DOING, Status.TODO,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.TESTING, Status.REVIEW, Status.DEPLOY,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.TESTING, Status.DEPLOY, Status.DONE,
                CategoryContractsTest::unexpected);
    }

    @Test
    void a_gate_line_does_not_let_another_category_out_nor_theirs_a_testing_card() {
        testingExitRefusal(Status.DOING, Status.REVIEW, CAUSE + "\n" + REPRODUCED, "Public contracts: none",
                "Proven by: the run\nObserved by: the metric");
        assertThat(bugRefusal(Status.DOING, Status.REVIEW, GATE)).contains("the lines `Cause: ");
    }

    @Test
    void the_quoted_testing_lines_are_the_ones_the_guide_states() {
        assertThat(CategoryGuide.of(Category.TESTING).description().replaceAll("\\s+", " "))
                .contains(COVERAGE_LINE, GREEN_LINE);
    }

    @Test
    void testings_full_refusals_are_worded_so() {
        assertThat(testingEntryRefusal(null, Status.TODO, "Add the refund e2e")).isEqualTo("testing contract, entry: "
                + "\"What gets covered, and why, and what is left out.\" Add a description line `Covers: <what gets "
                + "covered, and why>` (or `What gets covered:`). Add a description line `Left out: <what is not "
                + "covered>`. A section works too: a heading with the label (`## What gets covered, and why`) "
                + "followed by its text. An agent's testing card enters To do or In progress with both; until then "
                + "it stays in refine.");
        assertThat(testingExitRefusal(Status.DOING, Status.REVIEW)).isEqualTo("testing contract, exit: \""
                + GREEN_LINE + "\" Comment on the card (cards.comment) a line `Gate: <the run of the project's gate "
                + "that shows the tests green, and its result>`, then move it to review again: no comment posted "
                + "since it last entered In progress has it. The board checks the lines are there; whether the run "
                + "is real, its tests green and deterministic, and every red it found fixed in the test or carded, "
                + "is the reviewer's.");
    }

    // ── JAVA-394: a documentation card names its audience and purpose to enter, and the code it was checked against ──

    private static final String AUDIENCE_LINE = "Who it is for, and what it is for.";
    private static final String VERIFIED_LINE = "The content is verified against the real code, never against another "
            + "document.";
    private static final String AUDIENCE = "Audience: agents picking up an Officium card cold";
    private static final String PURPOSE = "Purpose: how a category's contract gates a card";
    private static final String VERIFIED = "Verified against: CategoryContracts.java at 1e3ce5c89, mvnw test green";

    private static String documentationEntryRefusal(Status from, Status to, String description) {
        try {
            CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.DOCUMENTATION, from, to,
                    description);
        } catch (OfficiumException e) {
            assertThat(e.code()).isEqualTo("contract_unmet");
            assertThat(e.httpStatus()).isEqualTo(409);
            assertThat(e.getMessage()).startsWith("documentation contract, entry: \"" + AUDIENCE_LINE + "\"")
                    .endsWith("until then it stays in refine.");
            assertThat(e.getMessage().split(Pattern.quote(AUDIENCE_LINE), -1)).hasSize(2);
            return e.getMessage();
        }
        throw new AssertionError("a documentation card entered work with " + description);
    }

    private static void assertDocumentationEnters(String description) {
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.DOCUMENTATION, null, Status.TODO,
                description);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.DOCUMENTATION, Status.REFINE,
                Status.DOING, description);
    }

    @Test
    void an_agents_documentation_card_entering_work_without_its_audience_and_purpose_is_refused_naming_both() {
        for (Status from : new Status[]{null, Status.REFINE}) {
            for (Status to : new Status[]{Status.TODO, Status.DOING}) {
                for (String description : new String[]{"Document the category gate", null}) {
                    assertThat(documentationEntryRefusal(from, to, description)).contains("`Audience: ", "`Purpose: ");
                }
            }
        }
    }

    @Test
    void the_documentation_entry_refusal_names_only_the_missing_line() {
        assertThat(documentationEntryRefusal(null, Status.TODO, AUDIENCE)).contains("`Purpose: ")
                .doesNotContain("`Audience: ");
        assertThat(documentationEntryRefusal(null, Status.TODO, PURPOSE)).contains("`Audience: ")
                .doesNotContain("`Purpose: ");
    }

    @Test
    void both_lines_let_a_documentation_card_in_plain_listed_bold_aliased_or_as_sections() {
        for (String description : new String[]{
                AUDIENCE + "\n" + PURPOSE,
                "Context first.\n\n- " + AUDIENCE + "\n* " + PURPOSE,
                "- **Audience:** agents\n- **Purpose:** how the gate works",
                "**Audience**: agents\n**Purpose**: how the gate works",
                "Who it is for: agents picking up a card\nWhat it is for: how the gate works",
                "**Who it is for:** agents\n- What it is for: how the gate works",
                "## Audience\n\nAgents picking up a card.\n\n## Purpose\nHow the gate works.",
                "## Who it is for\nAgents.\n## What it is for\nThe gate."}) {
            assertDocumentationEnters(description);
        }
    }

    @Test
    void a_documentation_label_is_a_line_with_a_value_not_a_mention() {
        assertThat(documentationEntryRefusal(null, Status.TODO, "The Audience: agents\nIts Purpose: the gate"))
                .contains("`Audience: ", "`Purpose: ");
        assertThat(documentationEntryRefusal(null, Status.TODO, "Audience:\n- agents\nPurpose:  \nnext"))
                .contains("`Audience: ", "`Purpose: ");
        assertThat(documentationEntryRefusal(null, Status.TODO, "purpose: lowercase is not the label\n" + AUDIENCE))
                .contains("`Purpose: ").doesNotContain("`Audience: ");
        assertThat(documentationEntryRefusal(null, Status.TODO, "## Audience\n## Purpose\nThe gate."))
                .contains("`Audience: ").doesNotContain("`Purpose: ");
        // The contract line itself, copied into a card, is not either label.
        assertThat(documentationEntryRefusal(null, Status.TODO, AUDIENCE_LINE)).contains("`Audience: ", "`Purpose: ");
    }

    @Test
    void documentation_entry_never_refuses_a_person_a_wall_refine_or_a_card_already_past_refine() {
        String none = "Document the category gate";
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.DOCUMENTATION, null, Status.TODO, none);
        CategoryContracts.requireEntry(ActorKind.PERSON, Executor.AI, Category.DOCUMENTATION, Status.REFINE,
                Status.DOING, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.HUMAN, Category.DOCUMENTATION, null, Status.DOING,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.HUMAN, Category.DOCUMENTATION, Status.REFINE,
                Status.TODO, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.DOCUMENTATION, null, Status.REFINE, none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.DOCUMENTATION, Status.TODO, Status.DOING,
                none);
        CategoryContracts.requireEntry(ActorKind.AGENT, Executor.AI, Category.DOCUMENTATION, Status.REVIEW,
                Status.TODO, none);
    }

    @Test
    void another_categorys_lines_do_not_let_a_documentation_card_in_nor_its_lines_them() {
        assertThat(documentationEntryRefusal(null, Status.TODO, COVERS + "\n" + LEFT_OUT + "\n" + BECAUSE + "\n"
                + ENDS_IN + "\n" + WITH_RUNBOOK)).contains("`Audience: ", "`Purpose: ");
        assertThat(testingEntryRefusal(null, Status.TODO, AUDIENCE + "\n" + PURPOSE)).contains("`Covers: ",
                "`Left out: ");
        assertRefactorEntryRefused(null, Status.TODO, AUDIENCE + "\n" + PURPOSE, "Restructured because", "Ends in");
    }

    private static String documentationExitRefusal(Status from, Status to, String... comments) {
        List<CardComment> thisRun = Arrays.stream(comments).map(text -> comment(text, RUN)).toList();
        try {
            CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.DOCUMENTATION, from, to,
                    () -> thisRun);
        } catch (OfficiumException e) {
            assertThat(e.code()).isEqualTo("contract_unmet");
            assertThat(e.httpStatus()).isEqualTo(409);
            assertThat(e.getMessage()).startsWith("documentation contract, exit: \"" + VERIFIED_LINE + "\"")
                    .contains("a line `Verified against: ").contains("move it to " + to.wire() + " again")
                    .contains("has it.").contains("is the reviewer's");
            return e.getMessage();
        }
        throw new AssertionError("a documentation card left its run with " + Arrays.toString(comments));
    }

    @Test
    void an_agents_documentation_card_leaving_its_run_without_a_verified_against_line_is_refused() {
        for (Status from : new Status[]{Status.REFINE, Status.TODO, Status.DOING, Status.READY}) {
            for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
                for (String[] comments : new String[][]{{}, {"Checked it against the code."}, {"Verified against:"},
                        {"Verified against:  \n- CategoryContracts.java"}, {"It was Verified against: the code"},
                        {"verified against: lowercase"}}) {
                    documentationExitRefusal(from, to, comments);
                }
            }
        }
    }

    @Test
    void a_verified_against_line_lets_it_out_plain_listed_bold_or_as_a_section() {
        for (Status to : new Status[]{Status.REVIEW, Status.DEPLOY, Status.DONE}) {
            for (String[] comments : new String[][]{{VERIFIED}, {"Done.", VERIFIED}, {"Done.\n\n- " + VERIFIED},
                    {"- **Verified against:** `git grep -n contract_unmet`, CardService.java"},
                    {"**Verified against**: OfficiumMcpRegistry.java at 1e3ce5c89"},
                    {"## Verified against\n\nCategoryContracts.java and its test, run green."}}) {
                CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.DOCUMENTATION, Status.DOING, to,
                        () -> Arrays.stream(comments).map(text -> comment(text, RUN)).toList());
            }
        }
    }

    @Test
    void a_verified_against_line_from_before_the_run_does_not_count() {
        CardComment before = comment(VERIFIED, Instant.parse("2026-10-01T10:59:59Z"));
        List<CardComment> thisRun = CategoryContracts.commentsSince(RUN, List.of(before, comment("Done.", RUN)));
        assertThatThrownBy(() -> CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.DOCUMENTATION,
                Status.DOING, Status.REVIEW, () -> thisRun)).hasMessageStartingWith("documentation contract, exit:")
                .hasMessageContaining("a line `Verified against: ");
    }

    @Test
    void documentation_exit_never_refuses_a_person_a_wall_a_move_back_or_a_card_past_its_run() {
        CategoryContracts.requireExit(ActorKind.PERSON, Executor.AI, Category.DOCUMENTATION, Status.DOING,
                Status.REVIEW, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.HUMAN, Category.DOCUMENTATION, Status.DOING,
                Status.DONE, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.DOCUMENTATION, Status.DOING, Status.TODO,
                CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.DOCUMENTATION, Status.REVIEW,
                Status.DEPLOY, CategoryContractsTest::unexpected);
        CategoryContracts.requireExit(ActorKind.AGENT, Executor.AI, Category.DOCUMENTATION, Status.DEPLOY,
                Status.DONE, CategoryContractsTest::unexpected);
    }

    @Test
    void a_verified_against_line_does_not_let_another_category_out_nor_theirs_a_documentation_card() {
        documentationExitRefusal(Status.DOING, Status.REVIEW, GATE, CAUSE + "\n" + REPRODUCED,
                "Public contracts: none", "Proven by: the run\nObserved by: the metric");
        assertThat(testingExitRefusal(Status.DOING, Status.REVIEW, VERIFIED)).contains("a line `Gate: ");
    }

    @Test
    void the_quoted_documentation_lines_are_the_ones_the_guide_states() {
        assertThat(CategoryGuide.of(Category.DOCUMENTATION).description().replaceAll("\\s+", " "))
                .contains(AUDIENCE_LINE, VERIFIED_LINE, "It documents what the code does, not what it was meant to do.",
                        "What changed is fixed, and what no longer exists is deleted, not only added to.");
    }

    @Test
    void documentations_full_refusals_are_worded_so() {
        assertThat(documentationEntryRefusal(null, Status.TODO, "Document the gate")).isEqualTo("documentation "
                + "contract, entry: \"Who it is for, and what it is for.\" Add a description line `Audience: <who it "
                + "is for>` (or `Who it is for:`). Add a description line `Purpose: <what it is for>` (or `What it is "
                + "for:`). A section works too: a heading with the label (`## Audience`) followed by its text. An "
                + "agent's documentation card enters To do or In progress with both; until then it stays in refine.");
        assertThat(documentationExitRefusal(Status.DOING, Status.REVIEW)).isEqualTo("documentation contract, exit: \""
                + VERIFIED_LINE + "\" Comment on the card (cards.comment) a line `Verified against: <the code it was "
                + "checked against: files, commands run, commits>`, then move it to review again: no comment posted "
                + "since it last entered In progress has it. The board checks the lines are there; whether it is "
                + "true, and names the code rather than another document, is the reviewer's, as is the behavior: the "
                + "content documents what the code does, not what it was meant to do, and what no longer exists is "
                + "deleted, not only added to.");
    }

    private static CardComment comment(Instant at) {
        return comment("Ran it: 0 failures", at);
    }

    private static CardComment comment(String text, Instant at) {
        return new CardComment(UUID.randomUUID(), UUID.randomUUID(), Actor.agent(UUID.randomUUID(), "Agent"), text,
                at, at);
    }

    private static List<CardComment> unexpected() {
        throw new AssertionError("evidence read when the gate does not apply");
    }
}
