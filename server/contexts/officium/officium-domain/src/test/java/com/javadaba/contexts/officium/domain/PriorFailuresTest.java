package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1803: the failure history around a planned card, ranked, budgeted and read for recurrence. */
class PriorFailuresTest {

    private static final UUID PROJECT = UUID.randomUUID();
    private static final Actor AGENT = Actor.agent(UUID.randomUUID(), "Agent");
    private static final PriorFailureSettings SETTINGS = PriorFailureSettings.DEFAULTS;
    private static final QualityRule VISUAL = QualityRule.find("ux_and_polish:visual-inconsistency").orElseThrow();

    @Test
    void aPlanWithNoHistoryAnswersEmpty() {
        PriorFailures answer = PriorFailures.answer(card("JAVA-1", Category.FEATURE, List.of()), List.of(), Map.of(),
                SETTINGS);

        assertThat(answer.items()).isEmpty();
        assertThat(answer.recurring()).isEmpty();
        assertThat(answer.droppedCards()).isZero();
        assertThat(answer.droppedFindings()).isZero();
    }

    @Test
    void aCardOnTheSamePathsCarriesItsSendBackAsCodeNeighbour() {
        PriorFailures.Failure back = sendBack("JAVA-9", Category.FEATURE, List.of(), "2026-10-20T10:00:00Z",
                ReviewReturnReason.TESTS_MISSING_OR_RED);

        PriorFailures answer = PriorFailures.answer(card("JAVA-1", Category.BUG, List.of()), List.of(back),
                Map.of("src/A.java", Set.of("JAVA-9")), SETTINGS);

        assertThat(answer.items()).containsExactly(
                new PriorFailures.Item(back, List.of(PriorFailures.Basis.CODE), List.of("src/A.java")));
    }

    @Test
    void aTouchedKeyMatchesWhateverItsCase() {
        PriorFailures.Failure back = sendBack("JAVA-9", Category.FEATURE, List.of(), "2026-10-20T10:00:00Z",
                ReviewReturnReason.OTHER);

        PriorFailures answer = PriorFailures.answer(card("JAVA-1", Category.BUG, List.of()), List.of(back),
                Map.of("src/A.java", Set.of("java-9")), SETTINGS);

        assertThat(answer.items()).extracting(PriorFailures.Item::bases)
                .containsExactly(List.of(PriorFailures.Basis.CODE));
    }

    @Test
    void thePlannedCardsOwnSendBacksAreNeverReturned() {
        PriorFailures.Failure own = sendBack("JAVA-1", Category.FEATURE, List.of(), "2026-10-20T10:00:00Z",
                ReviewReturnReason.OTHER);

        PriorFailures answer = PriorFailures.answer(card("JAVA-1", Category.FEATURE, List.of()), List.of(own),
                Map.of("src/A.java", Set.of("JAVA-1")), SETTINGS);

        assertThat(answer.items()).isEmpty();
    }

    @Test
    void anIntegrationOnlySendBackIsCodeNeighbourButNeverKind() {
        PriorFailures.Failure integration = sendBack("JAVA-9", Category.FEATURE, List.of(), "2026-10-20T10:00:00Z",
                ReviewReturnReason.INTEGRATION_FAILED);
        PriorFailures.Failure bystander = sendBack("JAVA-8", Category.FEATURE, List.of(), "2026-10-20T10:00:00Z",
                ReviewReturnReason.INTEGRATION_FAILED);

        PriorFailures ofKind = PriorFailures.answer(card("JAVA-1", Category.FEATURE, List.of()), List.of(bystander),
                Map.of(), SETTINGS);
        PriorFailures ofPath = PriorFailures.answer(card("JAVA-1", Category.FEATURE, List.of()), List.of(integration),
                Map.of("src/A.java", Set.of("JAVA-9")), SETTINGS);

        assertThat(ofKind.items()).isEmpty();
        assertThat(ofPath.items()).extracting(PriorFailures.Item::bases)
                .containsExactly(List.of(PriorFailures.Basis.CODE));
    }

    @Test
    void aSendBackOfTheSameCategoryAndASharedSignalIsKindNeighbour() {
        PriorFailures.Failure back = sendBack("JAVA-9", Category.BUG, List.of(Signal.TOUCHES_UI),
                "2026-10-20T10:00:00Z", ReviewReturnReason.OTHER);

        PriorFailures shared = PriorFailures.answer(card("JAVA-1", Category.BUG, List.of(Signal.TOUCHES_UI)),
                List.of(back), Map.of(), SETTINGS);
        PriorFailures unrelated = PriorFailures.answer(
                card("JAVA-1", Category.BUG, List.of(Signal.TOUCHES_INFRASTRUCTURE)),
                List.of(back), Map.of(), SETTINGS);

        assertThat(shared.items()).extracting(PriorFailures.Item::bases)
                .containsExactly(List.of(PriorFailures.Basis.KIND));
        assertThat(unrelated.items()).isEmpty();
    }

    @Test
    void aCardNamedByThePathsAndOfTheSameKindIsOneItemWithBothBases() {
        PriorFailures.Failure back = sendBack("JAVA-9", Category.BUG, List.of(), "2026-10-20T10:00:00Z",
                ReviewReturnReason.REGRESSION);

        PriorFailures answer = PriorFailures.answer(card("JAVA-1", Category.BUG, List.of()), List.of(back),
                Map.of("src/A.java", Set.of("JAVA-9")), SETTINGS);

        assertThat(answer.items()).hasSize(1);
        assertThat(answer.items().get(0).bases())
                .containsExactly(PriorFailures.Basis.CODE, PriorFailures.Basis.KIND);
    }

    @Test
    void aSharedRuleInALensIsRuleNeighbourAndCodeOutranksIt() {
        PriorFailures.Failure rule = escaped("JAVA-7", Category.FEATURE, "2026-10-21T10:00:00Z", VISUAL);
        PriorFailures.Failure code = sendBack("JAVA-9", Category.FEATURE, List.of(), "2026-10-01T10:00:00Z",
                ReviewReturnReason.OTHER);

        PriorFailures answer = PriorFailures.answer(card("JAVA-1", Category.FEATURE, List.of(Signal.TOUCHES_UI)),
                List.of(rule, code), Map.of("src/A.java", Set.of("JAVA-9")), SETTINGS);

        assertThat(answer.items()).extracting(item -> item.failure().cardKey())
                .containsExactly("JAVA-9", "JAVA-7");
        assertThat(answer.items().get(1).bases()).containsExactly(PriorFailures.Basis.RULE);
    }

    @Test
    void aRuleOutsideTheLenssIsNoNeighbour() {
        PriorFailures.Failure rule = escaped("JAVA-7", Category.FEATURE, "2026-10-21T10:00:00Z", VISUAL);

        PriorFailures answer = PriorFailures.answer(card("JAVA-1", Category.FEATURE, List.of()), List.of(rule),
                Map.of(),
                SETTINGS);

        assertThat(answer.items()).isEmpty();
    }

    @Test
    void theBudgetHoldsForFindingsAndCards() {
        PriorFailureSettings tight = new PriorFailureSettings(14, 1, 2, 3);
        List<PriorFailures.Failure> rows = List.of(
                sendBack("JAVA-3", Category.FEATURE, List.of(), "2026-10-21T10:00:00Z", ReviewReturnReason.OTHER),
                sendBack("JAVA-3", Category.FEATURE, List.of(), "2026-10-20T10:00:00Z", ReviewReturnReason.OTHER),
                sendBack("JAVA-2", Category.FEATURE, List.of(), "2026-10-19T10:00:00Z", ReviewReturnReason.OTHER),
                sendBack("JAVA-2", Category.FEATURE, List.of(), "2026-10-18T10:00:00Z", ReviewReturnReason.OTHER),
                sendBack("JAVA-4", Category.FEATURE, List.of(), "2026-10-17T10:00:00Z", ReviewReturnReason.OTHER),
                sendBack("JAVA-4", Category.FEATURE, List.of(), "2026-10-16T10:00:00Z", ReviewReturnReason.OTHER));

        PriorFailures answer = PriorFailures.answer(card("JAVA-1", Category.FEATURE, List.of()), rows,
                Map.of("src/A.java", Set.of("JAVA-2", "JAVA-3", "JAVA-4")), tight);

        assertThat(answer.items()).hasSize(2);
        assertThat(answer.items()).extracting(item -> item.failure().cardKey()).containsOnly("JAVA-3");
        assertThat(answer.droppedCards()).isEqualTo(2);
        assertThat(answer.droppedFindings()).isEqualTo(4);
    }

    @Test
    void aReasonAndCategoryAtThresholdRecurAndOneBelowDoesNot() {
        List<PriorFailures.Failure> three = List.of(
                sendBack("JAVA-3", Category.BUG, List.of(), "2026-10-21T10:00:00Z",
                        ReviewReturnReason.TESTS_MISSING_OR_RED),
                sendBack("JAVA-2", Category.BUG, List.of(), "2026-10-20T10:00:00Z",
                        ReviewReturnReason.TESTS_MISSING_OR_RED),
                sendBack("JAVA-4", Category.BUG, List.of(), "2026-10-19T10:00:00Z",
                        ReviewReturnReason.TESTS_MISSING_OR_RED));

        PriorFailures flagged = PriorFailures.answer(card("JAVA-1", Category.FEATURE, List.of()), three, Map.of(),
                SETTINGS);
        PriorFailures below = PriorFailures.answer(card("JAVA-1", Category.FEATURE, List.of()), three.subList(0, 2),
                Map.of(), SETTINGS);

        assertThat(flagged.recurring()).containsExactly(new PriorFailures.Recurring(
                ReviewReturnReason.TESTS_MISSING_OR_RED, new PriorFailures.Area("category", "bug"), 3,
                List.of("JAVA-3", "JAVA-2", "JAVA-4")));
        assertThat(below.recurring()).isEmpty();
    }

    @Test
    void integrationFailuresNeverRecur() {
        List<PriorFailures.Failure> rows = List.of(
                sendBack("JAVA-3", Category.BUG, List.of(), "2026-10-21T10:00:00Z",
                        ReviewReturnReason.INTEGRATION_FAILED),
                sendBack("JAVA-2", Category.BUG, List.of(), "2026-10-20T10:00:00Z",
                        ReviewReturnReason.INTEGRATION_FAILED),
                sendBack("JAVA-4", Category.BUG, List.of(), "2026-10-19T10:00:00Z",
                        ReviewReturnReason.INTEGRATION_FAILED));

        assertThat(PriorFailures.answer(card("JAVA-1", Category.FEATURE, List.of()), rows, Map.of(), SETTINGS)
                .recurring()).isEmpty();
    }

    @Test
    void anEscapedDefectWithoutRulesIsNoNeighbour() {
        PriorFailures.Failure functional = new PriorFailures.Failure(UUID.randomUUID(),
                PriorFailures.Failure.Kind.ESCAPED_DEFECT, Category.FEATURE, "JAVA-7", List.of(),
                Instant.parse("2026-10-21T10:00:00Z"), List.of(), List.of(), null, "Title", null, null, null);

        PriorFailures answer = PriorFailures.answer(card("JAVA-1", Category.FEATURE, List.of(Signal.TOUCHES_UI)),
                List.of(functional), Map.of(), SETTINGS);

        assertThat(answer.items()).isEmpty();
        assertThat(functional.quote()).isEmpty();
    }

    private static Card card(String key, Category category, List<Signal> signals) {
        Instant at = Instant.parse("2026-09-01T10:00:00Z");
        return new Card(UUID.randomUUID(), PROJECT, key, 1, "Title", null, null, Status.TODO, RunState.IDLE,
                Priority.MEDIUM, Executor.AI, category, 0, 0, null, List.of(), List.of(), 1, at, at,
                AGENT, AGENT, null, null, null, null, 0, signals, null, null);
    }

    private static PriorFailures.Failure sendBack(String key, Category category, List<Signal> signals, String at,
            ReviewReturnReason... reasons) {
        return new PriorFailures.Failure(UUID.randomUUID(), PriorFailures.Failure.Kind.SEND_BACK, category, key,
                signals, Instant.parse(at), List.of(reasons), List.of(), null, "Title", "todo", "doing",
                "backend-developer");
    }

    private static PriorFailures.Failure escaped(String key, Category category, String at, QualityRule rule) {
        return new PriorFailures.Failure(UUID.randomUUID(), PriorFailures.Failure.Kind.ESCAPED_DEFECT, category, key,
                List.of(), Instant.parse(at), List.of(), List.of(rule), null, "Title", null, null, null);
    }
}
