package com.javadaba.contexts.officium.domain;

import com.javadaba.contexts.officium.domain.IntegrationGateEvaluation.Facts;
import com.javadaba.contexts.officium.domain.IntegrationGateEvaluation.Held;
import com.javadaba.contexts.officium.domain.IntegrationGateEvaluation.Reason;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** JAVA-1820: the gate's rules are validated, and each rule opens at its boundary and not before. */
class IntegrationGateTest {

    private static IntegrationGate.Rules rules(boolean held, Priority min, boolean queue, int max, boolean nothing) {
        return new IntegrationGate.Rules(new IntegrationGate.HeldByDeploy(held, min),
                new IntegrationGate.DeployQueue(queue, max), new IntegrationGate.NothingElse(nothing));
    }

    private static Facts facts(List<Held> held, int deploy, boolean next) {
        return new Facts(held, IntStream.rangeClosed(1, deploy).mapToObj(i -> "JAVA-" + i).toList(), next);
    }

    @Test
    void noInputIsEveryRuleOffAndTheDefaultsAreInRange() {
        IntegrationGate.Rules rules = IntegrationGate.rules(new IntegrationGate.Input(null, null, null, null, null));

        assertThat(rules.anyEnabled()).isFalse();
        assertThat(rules).isEqualTo(IntegrationGate.Rules.OFF);
    }

    @Test
    void aBadPriorityOrAMaxOutOfRangeIsRefusedWithTheFieldThatBroke() {
        assertThatThrownBy(() -> IntegrationGate.rules(new IntegrationGate.Input(true, "urgent", null, null, null)))
                .isInstanceOfSatisfying(IntegrationGate.InvalidException.class, ex -> {
                    assertThat(ex.code()).isEqualTo("integration_gate_invalid");
                    assertThat(ex.httpStatus()).isEqualTo(422);
                    assertThat(ex.field()).isEqualTo("heldByDeploy.minPriority");
                });
        assertThatThrownBy(() -> IntegrationGate.rules(new IntegrationGate.Input(null, null, true, 0, null)))
                .isInstanceOf(IntegrationGate.InvalidException.class);
        assertThatThrownBy(() -> IntegrationGate.rules(new IntegrationGate.Input(null, null, true, 501, null)))
                .isInstanceOf(IntegrationGate.InvalidException.class);
        assertThat(IntegrationGate.rules(new IntegrationGate.Input(null, null, true, 1, null)).deployQueue().max())
                .isEqualTo(1);
        assertThat(IntegrationGate.rules(new IntegrationGate.Input(null, null, true, 500, null)).deployQueue().max())
                .isEqualTo(500);
    }

    @Test
    void heldByDeployOpensAtTheMinimumPriorityAndNotBelow() {
        IntegrationGate.Rules rules = rules(true, Priority.HIGH, false, 5, false);
        Held atMinimum = new Held("JAVA-2", Priority.HIGH, List.of("JAVA-1"));
        Held below = new Held("JAVA-3", Priority.MEDIUM, List.of("JAVA-1"));

        assertThat(IntegrationGateEvaluation.evaluate(rules, facts(List.of(below), 1, true))).isEmpty();
        List<Reason> reasons = IntegrationGateEvaluation.evaluate(rules, facts(List.of(atMinimum, below), 1, true));
        assertThat(reasons).hasSize(1);
        assertThat(reasons.get(0).rule()).isEqualTo("heldByDeploy");
        assertThat(reasons.get(0).cards()).containsExactly("JAVA-2");
        assertThat(reasons.get(0).message())
                .isEqualTo("JAVA-2 waits on JAVA-1, which is in Deploy: it needs the control branch merged.");
    }

    @Test
    void aDisabledRuleNeverOpens() {
        Held held = new Held("JAVA-2", Priority.SUPER_HIGH, List.of("JAVA-1"));

        assertThat(IntegrationGateEvaluation.evaluate(rules(false, Priority.LOW, false, 1, false),
                facts(List.of(held), 9, false))).isEmpty();
    }

    @Test
    void theDeployQueueOpensAtItsLimit() {
        IntegrationGate.Rules rules = rules(false, Priority.HIGH, true, 3, false);

        assertThat(IntegrationGateEvaluation.evaluate(rules, facts(List.of(), 2, true))).isEmpty();
        List<Reason> reasons = IntegrationGateEvaluation.evaluate(rules, facts(List.of(), 3, true));
        assertThat(reasons).extracting(Reason::rule).containsExactly("deployQueue");
        assertThat(reasons.get(0).cards()).containsExactly("JAVA-1", "JAVA-2", "JAVA-3");
    }

    @Test
    void theQueueNamesAFewCardsOnly() {
        List<Reason> reasons = IntegrationGateEvaluation.evaluate(rules(false, Priority.HIGH, true, 1, false),
                facts(List.of(), 9, true));

        assertThat(reasons.get(0).cards()).hasSize(IntegrationGateEvaluation.NAMED);
    }

    @Test
    void nothingElseNeedsNothingToHandOutAndSomethingInDeploy() {
        IntegrationGate.Rules rules = rules(false, Priority.HIGH, false, 5, true);

        assertThat(IntegrationGateEvaluation.evaluate(rules, facts(List.of(), 2, true))).isEmpty();
        assertThat(IntegrationGateEvaluation.evaluate(rules, facts(List.of(), 0, false))).isEmpty();
        assertThat(IntegrationGateEvaluation.evaluate(rules, facts(List.of(), 1, false)))
                .extracting(Reason::rule).containsExactly("nothingElse");
    }
}
