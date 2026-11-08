package com.javadaba.contexts.officium.domain.jql;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Assignee;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardRejection;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.RejectionReason;
import com.javadaba.contexts.officium.domain.ReviewReturn;
import com.javadaba.contexts.officium.domain.ReviewReturnReason;
import com.javadaba.contexts.officium.domain.RunState;
import com.javadaba.contexts.officium.domain.Status;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Evaluation and sorting over {@link Card}s -- checked against {@code jql.ts}'s
 * {@code matchesJql}/{@code sortByJql} (contract JDB-270): running the query the parser produced
 * is what the search view (and now the server) actually cares about, so parsing alone
 * ({@link JqlParserTest}) is not enough.
 */
class JqlEvaluatorTest {

    private static final Actor AGENT = Actor.agent(UUID.randomUUID(), "claude-code");
    private static final UUID CARLOS = UUID.randomUUID();
    private static final Instant T0 = Instant.parse("2026-09-20T10:00:00Z");
    private static final Predicate<Card> NEVER_BLOCKED = c -> false;

    private static Card card(int number, Status status, Priority priority, Executor executor, Category category) {
        return new Card(UUID.randomUUID(), UUID.randomUUID(), "OFF-" + number, number, "Fix login bug",
                "It affects checkout on mobile", null, status, RunState.IDLE, priority, executor, category, 0, 3.0,
                "Security", List.of("auth"), List.of(new Assignee(CARLOS, "Carlos")), 1, T0, T0, AGENT, AGENT, null,
                null, null, null, 0, List.of(), null);
    }

    private static Card basic() {
        return card(12, Status.TODO, Priority.HIGH, Executor.AI, Category.BUG);
    }

    private static boolean matches(String jql, Card card, JqlContext ctx) {
        return JqlEvaluator.matches(card, JqlParser.parse(jql).where(), ctx, NEVER_BLOCKED);
    }

    private static boolean matches(String jql, Card card) {
        return matches(jql, card, new JqlContext(null, T0));
    }

    // ── text containment (~) ───────────────────────────────────────────────────────────────────

    @Test
    void textContainmentRequiresEveryWordAnywhereInTheJoinedText() {
        Card card = basic();

        assertThat(matches("text ~ \"login\"", card)).isTrue();
        assertThat(matches("text ~ \"login checkout\"", card)).isTrue(); // one word per field, both present
        assertThat(matches("text ~ \"shipping\"", card)).isFalse();
        assertThat(matches("text !~ \"shipping\"", card)).isTrue();
    }

    @Test
    void summaryContainmentOnlyLooksAtTheTitle() {
        Card card = basic();

        assertThat(matches("summary ~ \"login\"", card)).isTrue();
        assertThat(matches("summary ~ \"checkout\"", card)).isFalse(); // that word is in the description, not the title
    }

    @Test
    void assigneeAndEpicContainmentLookAtNamesNotTheWholeCard() {
        Card card = basic();

        assertThat(matches("assignee ~ \"carlos\"", card)).isTrue();
        assertThat(matches("epic ~ \"security\"", card)).isTrue();
        assertThat(matches("epic ~ \"login\"", card)).isFalse();
    }

    // ── IS EMPTY / IS NOT EMPTY ─────────────────────────────────────────────────────────────────

    @Test
    void isEmptyReadsAssigneeEpicLabelsDescriptionAndCategory() {
        Card withNothing = new Card(UUID.randomUUID(), UUID.randomUUID(), "OFF-1", 1, "T", "  ", null, Status.TODO,
                RunState.IDLE, Priority.MEDIUM, Executor.AI, null, 0, 0, null, List.of(), List.of(), 1, T0, T0, AGENT,
                AGENT, null, null, null, null, 0, List.of(), null);

        assertThat(matches("assignee is EMPTY", withNothing)).isTrue();
        assertThat(matches("epic is EMPTY", withNothing)).isTrue();
        assertThat(matches("labels is EMPTY", withNothing)).isTrue();
        assertThat(matches("description is EMPTY", withNothing)).isTrue();
        assertThat(matches("category is EMPTY", withNothing)).isTrue();

        Card full = basic();
        assertThat(matches("assignee is not EMPTY", full)).isTrue();
        assertThat(matches("epic is not EMPTY", full)).isTrue();
        assertThat(matches("labels is not EMPTY", full)).isTrue();
    }

    // ── currentUser() ───────────────────────────────────────────────────────────────────────────

    @Test
    void currentUserMatchesOnlyTheSignedInAccount() {
        Card card = basic();

        assertThat(matches("assignee = currentUser()", card, new JqlContext(CARLOS, T0))).isTrue();
        assertThat(matches("assignee = currentUser()", card, new JqlContext(UUID.randomUUID(), T0))).isFalse();
        assertThat(matches("assignee = currentUser()", card, new JqlContext(null, T0))).isFalse();
    }

    // ── vocabulary aliases (ids, labels, Jira-isms) ─────────────────────────────────────────────

    @Test
    void statusAcceptsBothItsIdAndItsBoardLabel() {
        Card doing = card(1, Status.DOING, Priority.MEDIUM, Executor.AI, null);

        assertThat(matches("status = doing", doing)).isTrue();
        assertThat(matches("status = \"In progress\"", doing)).isTrue();
        assertThat(matches("status = Completed", card(2, Status.DONE, Priority.MEDIUM, Executor.AI, null))).isTrue();
    }

    // card://JAVA-1415
    @Test
    void rejectedIsAStatusAndItsReasonAFieldEmptyOnEveryOtherCard() {
        Card open = basic();
        Card duplicate = rejected(RejectionReason.DUPLICATE);
        Card notNeeded = rejected(RejectionReason.NOT_NEEDED);

        assertThat(matches("status = rejected", duplicate)).isTrue();
        assertThat(matches("status = Rejected", open)).isFalse();
        assertThat(matches("rejection = duplicate", duplicate)).isTrue();
        assertThat(matches("rejection = duplicate", notNeeded)).isFalse();
        assertThat(matches("rejection = \"Not needed\"", notNeeded)).isTrue();
        assertThat(matches("rejection in (duplicate, not-needed)", notNeeded)).isTrue();
        assertThat(matches("rejection in (superseded, wrong-split)", duplicate)).isFalse();
        assertThat(matches("rejection is EMPTY", open)).isTrue();
        assertThat(matches("rejection is not EMPTY", duplicate)).isTrue();
    }

    @Test
    void anUnknownRejectionReasonIsRefusedLikeAnUnknownStatus() {
        assertThatThrownBy(() -> JqlParser.parse("rejection = boring"))
                .isInstanceOf(JqlInvalidException.class)
                .hasMessageContaining("does not exist for the field 'rejection'");
    }

    @Test
    void sentBackCountsAndReturnReasonReadTheCardsSendBackLog() {
        Card never = basic();
        Card once = basic();
        Card twice = basic();
        JqlCardFacts facts = new JqlCardFacts() {
            @Override
            public boolean blocked(Card card) {
                return false;
            }

            @Override
            public List<ReviewReturn> returns(Card card) {
                if (card == once) {
                    return List.of(sentBack(card, ReviewReturnReason.REGRESSION));
                }
                return card == twice
                        ? List.of(sentBack(card, ReviewReturnReason.OTHER),
                                sentBack(card, ReviewReturnReason.TESTS_MISSING_OR_RED))
                        : List.of();
            }
        };

        assertThat(matchesWith("sentBack = 0", never, facts)).isTrue();
        assertThat(matchesWith("sentBack > 0", never, facts)).isFalse();
        assertThat(matchesWith("reviewReturns >= 2", twice, facts)).isTrue();
        assertThat(matchesWith("reviewReturns >= 2", once, facts)).isFalse();
        assertThat(matchesWith("returnReason = regression", once, facts)).isTrue();
        assertThat(matchesWith("returnReason = regression", twice, facts)).isFalse();
        assertThat(matchesWith("returnReason in (other, regression)", twice, facts)).isTrue();
        assertThat(matchesWith("returnReason = \"Tests missing or red\"", twice, facts)).isTrue();
        assertThat(matchesWith("returnReason is EMPTY", never, facts)).isTrue();
        assertThat(matchesWith("returnReason is not EMPTY", once, facts)).isTrue();
    }

    @Test
    void anUnknownReturnReasonIsRefused() {
        assertThatThrownBy(() -> JqlParser.parse("returnReason = boring"))
                .isInstanceOf(JqlInvalidException.class)
                .hasMessageContaining("does not exist for the field 'returnreason'");
    }

    private static boolean matchesWith(String jql, Card card, JqlCardFacts facts) {
        return JqlEvaluator.matches(card, JqlParser.parse(jql).where(), new JqlContext(CARLOS, T0), facts);
    }

    private static ReviewReturn sentBack(Card card, ReviewReturnReason reason) {
        return new ReviewReturn(UUID.randomUUID(), card.projectId(), card.id(), T0, AGENT, null, Status.REVIEW,
                Status.DOING, List.of(reason), null);
    }

    private static Card rejected(RejectionReason reason) {
        Card base = card(7, Status.REJECTED, Priority.MEDIUM, Executor.AI, Category.FEATURE);
        return new Card(base.id(), base.projectId(), base.key(), base.number(), base.title(), base.description(),
                null, base.status(), base.runState(), base.priority(), base.executor(), base.category(), 0, 0,
                null, List.of(), List.of(), 1, T0, T0, AGENT, AGENT, null, null, null, null, 0, List.of(), null,
                new CardRejection(reason, "What was wrong", null));
    }

    @Test
    void priorityAcceptsJirasHighestAndLowestAliases() {
        Card superHigh = card(1, Status.TODO, Priority.SUPER_HIGH, Executor.AI, null);
        Card superLow = card(2, Status.TODO, Priority.SUPER_LOW, Executor.AI, null);

        assertThat(matches("priority = Highest", superHigh)).isTrue();
        assertThat(matches("priority = Lowest", superLow)).isTrue();
        assertThat(matches("priority = Critical", superHigh)).isTrue();
    }

    @Test
    void categoryAcceptsTypeAliasesAndJiraWords() {
        Card story = card(1, Status.TODO, Priority.MEDIUM, Executor.AI, Category.USER_STORY);
        Card debt = card(2, Status.TODO, Priority.MEDIUM, Executor.AI, Category.TECHNICAL_DEBT);

        assertThat(matches("category = story", story)).isTrue();
        assertThat(matches("type = \"User story\"", story)).isTrue();
        assertThat(matches("category = techdebt", debt)).isTrue();
    }

    @Test
    void executorAcceptsAgentAndPersonAsAliases() {
        Card ai = card(1, Status.TODO, Priority.MEDIUM, Executor.AI, null);
        Card human = card(2, Status.TODO, Priority.MEDIUM, Executor.HUMAN, null);

        assertThat(matches("executor = agent", ai)).isTrue();
        assertThat(matches("executor = person", human)).isTrue();
    }

    // ── ordered comparisons ─────────────────────────────────────────────────────────────────────

    @Test
    void priorityOrderedComparisonReadsMoreUrgentAsGreater() {
        Card high = card(1, Status.TODO, Priority.HIGH, Executor.AI, null);
        Card low = card(2, Status.TODO, Priority.LOW, Executor.AI, null);

        assertThat(matches("priority >= High", high)).isTrue();
        assertThat(matches("priority >= High", low)).isFalse();
    }

    @Test
    void keyOrderedComparisonStripsThePrefix() {
        Card off12 = card(12, Status.TODO, Priority.MEDIUM, Executor.AI, null);

        assertThat(matches("key > 5", off12)).isTrue();
        assertThat(matches("key > OFF-20", off12)).isFalse();
    }

    @Test
    void estimateOrderedComparison() {
        Card card = basic(); // estimate = 3.0

        assertThat(matches("estimate > 2", card)).isTrue();
        assertThat(matches("estimate <= 3", card)).isTrue();
        assertThat(matches("estimate < 3", card)).isFalse();
    }

    // ── dates ───────────────────────────────────────────────────────────────────────────────────

    @Test
    void aBareDayIsTheWholeDayAsARange() {
        Card updatedNoon = withUpdatedAt(basic(), Instant.parse("2026-09-20T12:00:00Z"));

        assertThat(matches("updated = 2026-09-20", updatedNoon)).isTrue();
        assertThat(matches("updated = 2026-09-21", updatedNoon)).isFalse();
        assertThat(matches("updated > 2026-09-20", updatedNoon)).isFalse();
        assertThat(matches("updated >= 2026-09-20", updatedNoon)).isTrue();
    }

    @Test
    void relativeDatesCountBackFromNow() {
        JqlContext ctx = new JqlContext(null, Instant.parse("2026-09-27T00:00:00Z"));
        Card updated6DaysAgo = withUpdatedAt(basic(), Instant.parse("2026-09-21T00:00:00Z"));
        Card updated10DaysAgo = withUpdatedAt(basic(), Instant.parse("2026-09-17T00:00:00Z"));

        assertThat(matches("updated >= -7d", updated6DaysAgo, ctx)).isTrue();
        assertThat(matches("updated >= -7d", updated10DaysAgo, ctx)).isFalse();
    }

    @Test
    void nowAndStartOfDayFunctionsResolveAgainstTheContext() {
        Instant now = Instant.parse("2026-09-27T15:30:00Z");
        JqlContext ctx = new JqlContext(null, now);
        Card updatedThisAfternoon = withUpdatedAt(basic(), now.minusSeconds(60));

        assertThat(matches("updated >= startOfDay()", updatedThisAfternoon, ctx)).isTrue();
        assertThat(matches("updated >= now()", withUpdatedAt(basic(), now), ctx)).isTrue();
    }

    // ── blocked (needs the predicate, not a stored field) ──────────────────────────────────────

    @Test
    void blockedReadsThroughThePredicateNotAColumn() {
        Card card = basic();

        assertThat(JqlEvaluator.matches(card, JqlParser.parse("blocked = true").where(), new JqlContext(null, T0),
                c -> true)).isTrue();
        assertThat(JqlEvaluator.matches(card, JqlParser.parse("blocked = false").where(), new JqlContext(null, T0),
                c -> true)).isFalse();
    }

    // ── IN / NOT IN, AND / OR / NOT composition ────────────────────────────────────────────────

    @Test
    void inMatchesAnyOfTheListedValues() {
        Card doing = card(1, Status.DOING, Priority.MEDIUM, Executor.AI, null);

        assertThat(matches("status in (\"To do\", \"In progress\")", doing)).isTrue();
        assertThat(matches("status not in (\"To do\", \"In progress\")", doing)).isFalse();
    }

    @Test
    void andOrNotComposeAcrossClauses() {
        Card human = card(7, Status.DOING, Priority.MEDIUM, Executor.HUMAN, null);

        assertThat(matches("status = doing AND executor = human", human)).isTrue();
        assertThat(matches("status = refine OR executor = human", human)).isTrue();
        assertThat(matches("NOT executor = human", human)).isFalse();
    }

    // ── sorting ─────────────────────────────────────────────────────────────────────────────────

    @Test
    void withNoOrderByTheDefaultIsMostRecentlyUpdatedFirst() {
        Card older = withUpdatedAt(card(1, Status.TODO, Priority.MEDIUM, Executor.AI, null), T0);
        Card newer = withUpdatedAt(card(2, Status.TODO, Priority.MEDIUM, Executor.AI, null), T0.plusSeconds(60));

        List<Card> sorted = JqlEvaluator.sort(List.of(older, newer), List.of());

        assertThat(sorted).containsExactly(newer, older);
    }

    @Test
    void anExplicitOrderByOverridesTheDefaultAndTiesBreakByKeyDescending() {
        Card a = card(3, Status.TODO, Priority.MEDIUM, Executor.AI, null);
        Card b = card(9, Status.TODO, Priority.MEDIUM, Executor.AI, null);

        List<Card> sorted = JqlEvaluator.sort(List.of(a, b),
                List.of(new JqlOrder(JqlFieldId.STATUS, JqlOrder.Dir.ASC)));

        assertThat(sorted).containsExactly(b, a); // same status -> tie-break, higher number first
    }

    private static Card withUpdatedAt(Card card, Instant updatedAt) {
        return new Card(card.id(), card.projectId(), card.key(), card.number(), card.title(), card.description(),
                card.actionPlan(), card.status(), card.runState(), card.priority(), card.executor(),
                card.category(), card.order(), card.estimate(), card.epic(), card.tags(), card.assignees(),
                card.version(), card.createdAt(), updatedAt, card.createdBy(), card.updatedBy(), card.deletedAt(),
                card.clientKey(), card.humanEdit(), card.sprintId(), card.rank(), card.signals(), card.subtype());
    }
}
