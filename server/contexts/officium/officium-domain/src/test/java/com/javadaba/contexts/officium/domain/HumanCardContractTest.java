package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** JAVA-1783: an agent's human card is born with its answer shape, a form or a "No form:" reason. */
class HumanCardContractTest {

    @Test
    void an_agents_human_card_without_a_form_or_a_reason_is_refused() {
        assertThatThrownBy(() -> HumanCardContract.requireForm(ActorKind.AGENT, Executor.HUMAN, false,
                "## Why this needs you\nDecide the price.\n"))
                .isInstanceOf(OfficiumException.class)
                .satisfies(ex -> {
                    OfficiumException e = (OfficiumException) ex;
                    assertThat(e.code()).isEqualTo("contract_unmet");
                    assertThat(e.httpStatus()).isEqualTo(409);
                    assertThat(e.getMessage()).contains("No form: <reason>");
                });
    }

    @Test
    void an_empty_reason_is_not_a_reason() {
        assertThatThrownBy(() -> HumanCardContract.requireForm(ActorKind.AGENT, Executor.HUMAN, false,
                "No form:   \nDecide the price."))
                .isInstanceOf(OfficiumException.class);
        assertThatThrownBy(() -> HumanCardContract.requireForm(ActorKind.AGENT, Executor.HUMAN, false, null))
                .isInstanceOf(OfficiumException.class);
    }

    @Test
    void a_form_or_a_no_form_line_with_its_reason_passes() {
        assertThatCode(() -> HumanCardContract.requireForm(ActorKind.AGENT, Executor.HUMAN, true, null))
                .doesNotThrowAnyException();
        assertThatCode(() -> HumanCardContract.requireForm(ActorKind.AGENT, Executor.HUMAN, false,
                "Rotate the key.\n\nNo form: the answer is a secret, not a choice."))
                .doesNotThrowAnyException();
        assertThatCode(() -> HumanCardContract.requireForm(ActorKind.AGENT, Executor.HUMAN, false,
                "- **No form**: the wall asks for a file, not a choice."))
                .doesNotThrowAnyException();
    }

    @Test
    void a_person_or_an_ai_card_is_never_refused() {
        assertThatCode(() -> HumanCardContract.requireForm(ActorKind.PERSON, Executor.HUMAN, false, null))
                .doesNotThrowAnyException();
        assertThatCode(() -> HumanCardContract.requireForm(ActorKind.AGENT, Executor.AI, false, null))
                .doesNotThrowAnyException();
    }
}
