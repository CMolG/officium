package com.javadaba.contexts.officium.domain.jql;

import com.javadaba.contexts.officium.domain.JqlInvalid;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The grammar surface, checked against {@code jql.ts} directly (contract JDB-270: the TypeScript
 * file is the spec) -- same fields, aliases, operators, functions, default sort, and error
 * wording. There is no dedicated unit suite for {@code jql.ts} itself (only the search e2e spec
 * exercises it end to end), so this table is derived from reading that file, not copied from one.
 */
class JqlParserTest {

    @Test
    void anEmptyQueryMatchesEveryCardAndSortsNothing() {
        JqlQuery query = JqlParser.parse("");

        assertThat(query.where()).isNull();
        assertThat(query.orderBy()).isEmpty();
    }

    @Test
    void aBlankQueryIsTheSameAsEmpty() {
        JqlQuery query = JqlParser.parse("   ");

        assertThat(query.where()).isNull();
    }

    @Test
    void aSimpleClauseHoldsTheFieldOperatorAndValue() {
        JqlQuery query = JqlParser.parse("status = \"To do\"");
        JqlNode.Clause clause = (JqlNode.Clause) query.where();

        assertThat(clause.field()).isEqualTo(JqlFieldId.STATUS);
        assertThat(clause.op()).isEqualTo(JqlOp.EQ);
        assertThat(clause.values()).singleElement().extracting(JqlValue::raw).isEqualTo("To do");
    }

    @Test
    void fieldNamesAreCaseAndSpaceInsensitiveAliasesOfTheirCanonicalName() {
        assertThat(((JqlNode.Clause) JqlParser.parse("STATUS = Refine").where()).field()).isEqualTo(JqlFieldId.STATUS);
        assertThat(((JqlNode.Clause) JqlParser.parse("Type = Bug").where()).field()).isEqualTo(JqlFieldId.CATEGORY);
        assertThat(((JqlNode.Clause) JqlParser.parse("issueType = Bug").where()).field())
                .isEqualTo(JqlFieldId.CATEGORY);
        assertThat(((JqlNode.Clause) JqlParser.parse("title ~ x").where()).field()).isEqualTo(JqlFieldId.SUMMARY);
        assertThat(((JqlNode.Clause) JqlParser.parse("tag = x").where()).field()).isEqualTo(JqlFieldId.LABELS);
        assertThat(((JqlNode.Clause) JqlParser.parse("issueKey = OFF-1").where()).field()).isEqualTo(JqlFieldId.KEY);
        assertThat(((JqlNode.Clause) JqlParser.parse("runState = idle").where()).field())
                .isEqualTo(JqlFieldId.RUN_STATE);
    }

    @Test
    void anUnknownFieldNamesFiveCandidates() {
        assertThatThrownBy(() -> JqlParser.parse("bogus = 1"))
                .isInstanceOfSatisfying(JqlInvalidException.class, ex -> {
                    assertThat(ex.getMessage()).isEqualTo(
                            "Field 'bogus' does not exist. Try status, priority, assignee, executor, category…");
                    assertThat(ex.at()).isZero();
                });
    }

    @Test
    void anOperatorNotSupportedByTheFieldIsRejected() {
        assertThatThrownBy(() -> JqlParser.parse("blocked > true"))
                .isInstanceOfSatisfying(JqlInvalidException.class,
                        ex -> assertThat(ex.getMessage())
                                .isEqualTo("The operator '>' is not supported by the 'blocked' field."));
    }

    @Test
    void andBindsTighterThanOr() {
        JqlQuery query = JqlParser.parse("epic = Security OR status = Refine AND executor = human");
        JqlNode.Or or = (JqlNode.Or) query.where();

        assertThat(or.items()).hasSize(2);
        assertThat(or.items().get(0)).isInstanceOf(JqlNode.Clause.class);
        assertThat(or.items().get(1)).isInstanceOf(JqlNode.And.class);
    }

    @Test
    void notAppliesToTheSingleExpressionAfterIt() {
        JqlQuery query = JqlParser.parse("NOT status = Refine");
        JqlNode.Not not = (JqlNode.Not) query.where();

        assertThat(not.item()).isInstanceOf(JqlNode.Clause.class);
    }

    @Test
    void parenthesesGroupAnOrInsideAnAnd() {
        JqlQuery query = JqlParser.parse("epic = Security OR (status in (\"In progress\") AND executor = human)");
        JqlNode.Or or = (JqlNode.Or) query.where();

        assertThat(or.items().get(1)).isInstanceOf(JqlNode.And.class);
    }

    @Test
    void inTakesACommaSeparatedListInParentheses() {
        JqlNode.Clause clause = (JqlNode.Clause) JqlParser.parse("status in (\"To do\", \"In progress\")").where();

        assertThat(clause.op()).isEqualTo(JqlOp.IN);
        assertThat(clause.values()).extracting(JqlValue::raw).containsExactly("To do", "In progress");
    }

    @Test
    void notInIsTwoKeywords() {
        JqlNode.Clause clause = (JqlNode.Clause) JqlParser.parse("status not in (Deploy, Completed)").where();

        assertThat(clause.op()).isEqualTo(JqlOp.NOT_IN);
    }

    @Test
    void isEmptyAndIsNotEmpty() {
        JqlNode.Clause empty = (JqlNode.Clause) JqlParser.parse("labels is EMPTY").where();
        JqlNode.Clause notEmpty = (JqlNode.Clause) JqlParser.parse("labels is not EMPTY").where();

        assertThat(empty.op()).isEqualTo(JqlOp.IS);
        assertThat(notEmpty.op()).isEqualTo(JqlOp.IS_NOT);
        assertThat(empty.values()).singleElement().extracting(JqlValue::empty).isEqualTo(true);
    }

    @Test
    void isEmptyAlsoAcceptsTheKeywordNull() {
        JqlNode.Clause clause = (JqlNode.Clause) JqlParser.parse("epic is null").where();

        assertThat(clause.op()).isEqualTo(JqlOp.IS);
    }

    @Test
    void isWithoutEmptyIsRejected() {
        assertThatThrownBy(() -> JqlParser.parse("labels is \"x\""))
                .isInstanceOfSatisfying(JqlInvalidException.class,
                        ex -> assertThat(ex.getMessage()).isEqualTo("Expecting EMPTY after 'is' but got 'x'."));
    }

    @Test
    void currentUserIsAFunctionOnlyAssigneeAndEpicAccept() {
        JqlNode.Clause clause = (JqlNode.Clause) JqlParser.parse("assignee = currentUser()").where();

        assertThat(clause.values()).singleElement().extracting(JqlValue::fn).isEqualTo(JqlFunction.CURRENT_USER);
    }

    @Test
    void currentUserIsRejectedOnAFieldThatIsNotAName() {
        assertThatThrownBy(() -> JqlParser.parse("status = currentUser()"))
                .isInstanceOfSatisfying(JqlInvalidException.class, ex -> assertThat(ex.getMessage())
                        .isEqualTo("The function 'currentUser()' is not supported by the 'status' field."));
    }

    @Test
    void theThreeDateFunctions() {
        assertThat(((JqlNode.Clause) JqlParser.parse("updated >= now()").where()).values().get(0).fn())
                .isEqualTo(JqlFunction.NOW);
        assertThat(((JqlNode.Clause) JqlParser.parse("updated >= startOfDay()").where()).values().get(0).fn())
                .isEqualTo(JqlFunction.START_OF_DAY);
        assertThat(((JqlNode.Clause) JqlParser.parse("updated >= startOfWeek()").where()).values().get(0).fn())
                .isEqualTo(JqlFunction.START_OF_WEEK);
    }

    @Test
    void anUnknownFunctionIsRejected() {
        assertThatThrownBy(() -> JqlParser.parse("updated >= bogus()"))
                .isInstanceOfSatisfying(JqlInvalidException.class,
                        ex -> assertThat(ex.getMessage()).isEqualTo("Unknown function 'bogus()'."));
    }

    @Test
    void relativeAndBareDayValuesParseAsPlainWords() {
        assertThat(((JqlNode.Clause) JqlParser.parse("created >= -7d").where()).values().get(0).raw())
                .isEqualTo("-7d");
        assertThat(((JqlNode.Clause) JqlParser.parse("created = 2026-09-01").where()).values().get(0).raw())
                .isEqualTo("2026-09-01");
    }

    @Test
    void anInvalidDateIsRejectedAtParseTime() {
        assertThatThrownBy(() -> JqlParser.parse("created = not-a-date"))
                .isInstanceOfSatisfying(JqlInvalidException.class, ex -> assertThat(ex.getMessage())
                        .isEqualTo("'not-a-date' is not a date. Use 2026-09-01 or a relative one like -7d."));
    }

    @Test
    void anInvalidNumberIsRejectedAtParseTime() {
        assertThatThrownBy(() -> JqlParser.parse("estimate > abc"))
                .isInstanceOfSatisfying(JqlInvalidException.class,
                        ex -> assertThat(ex.getMessage()).isEqualTo("'abc' is not a number."));
    }

    @Test
    void anUnknownEnumValueNamesTheField() {
        assertThatThrownBy(() -> JqlParser.parse("status = Bogus"))
                .isInstanceOfSatisfying(JqlInvalidException.class, ex -> assertThat(ex.getMessage())
                        .isEqualTo("The value 'Bogus' does not exist for the field 'status'."));
    }

    @Test
    void orderByDefaultsDateFieldsToDescendingAndEverythingElseToAscending() {
        JqlQuery byUpdated = JqlParser.parse("ORDER BY updated");
        JqlQuery byKey = JqlParser.parse("ORDER BY key");

        assertThat(byUpdated.orderBy()).containsExactly(new JqlOrder(JqlFieldId.UPDATED, JqlOrder.Dir.DESC));
        assertThat(byKey.orderBy()).containsExactly(new JqlOrder(JqlFieldId.KEY, JqlOrder.Dir.ASC));
    }

    @Test
    void orderByTakesSeveralFieldsAndAnExplicitDirection() {
        JqlQuery query = JqlParser.parse("ORDER BY priority DESC, key ASC");

        assertThat(query.orderBy()).containsExactly(
                new JqlOrder(JqlFieldId.PRIORITY, JqlOrder.Dir.DESC),
                new JqlOrder(JqlFieldId.KEY, JqlOrder.Dir.ASC));
    }

    @Test
    void aFieldThatCannotBeSortedByIsRejected() {
        assertThatThrownBy(() -> JqlParser.parse("ORDER BY text"))
                .isInstanceOfSatisfying(JqlInvalidException.class,
                        ex -> assertThat(ex.getMessage()).isEqualTo("The field 'text' cannot be sorted by."));
    }

    @Test
    void aWhereClauseAndAnOrderByCombine() {
        JqlQuery query = JqlParser.parse("status = Refine ORDER BY updated DESC");

        assertThat(query.where()).isInstanceOf(JqlNode.Clause.class);
        assertThat(query.orderBy()).containsExactly(new JqlOrder(JqlFieldId.UPDATED, JqlOrder.Dir.DESC));
    }

    @Test
    void trailingGarbageAfterAClauseIsRejected() {
        assertThatThrownBy(() -> JqlParser.parse("status = Refine bogus"))
                .isInstanceOfSatisfying(JqlInvalidException.class, ex -> assertThat(ex.getMessage())
                        .isEqualTo("Expecting AND, OR or ORDER BY but got 'bogus'."));
    }

    @Test
    void anUnclosedQuoteIsCaughtByTheLexer() {
        assertThatThrownBy(() -> JqlParser.parse("status = \"To do"))
                .isInstanceOfSatisfying(JqlInvalidException.class,
                        ex -> assertThat(ex.getMessage()).isEqualTo("The quoted string is not closed."));
    }

    @Test
    void anInvalidCharacterIsCaughtByTheLexer() {
        assertThatThrownBy(() -> JqlParser.parse("status = #"))
                .isInstanceOfSatisfying(JqlInvalidException.class,
                        ex -> assertThat(ex.getMessage()).isEqualTo("The character '#' is not valid here."));
    }

    @Test
    void anUnmatchedOpenParenIsRejected() {
        assertThatThrownBy(() -> JqlParser.parse("(status = Refine"))
                .isInstanceOfSatisfying(JqlInvalidException.class,
                        ex -> assertThat(ex.getMessage()).isEqualTo("Expecting ')' but got the end of the query."));
    }

    @Test
    void theExceptionCarriesTheCharacterOffsetAsJqlInvalid() {
        try {
            JqlParser.parse("status = Bogus");
        } catch (JqlInvalidException ex) {
            assertThat(ex).isInstanceOf(JqlInvalid.class);
            assertThat(ex.at()).isEqualTo("status = ".length());
            assertThat(ex.code()).isEqualTo("jql_invalid");
            assertThat(ex.httpStatus()).isEqualTo(400);
            return;
        }
        throw new AssertionError("expected JqlInvalidException");
    }
}
