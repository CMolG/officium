package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatNoException;

/** JAVA-1042: an agent works a card In progress, and To do is only where its plan is checked. */
class InProgressContractTest {

    @Test
    void an_agent_cannot_take_a_card_from_to_do_past_the_work() {
        for (Status to : new Status[]{Status.READY, Status.REVIEW, Status.DEPLOY, Status.DONE}) {
            assertThatThrownBy(() -> InProgressContract.requireWorkedInProgress(ActorKind.AGENT, Executor.AI,
                    Category.FEATURE, Status.TODO, to))
                    .isInstanceOf(OfficiumException.class)
                    .satisfies(ex -> {
                        OfficiumException e = (OfficiumException) ex;
                        assertThat(e.code()).isEqualTo("contract_unmet");
                        assertThat(e.httpStatus()).isEqualTo(409);
                        assertThat(e.getMessage()).contains("To do contract").contains("Move it to doing");
                    });
        }
    }

    @Test
    void the_check_in_to_do_ends_in_progress_or_back_in_refine() {
        assertThatNoException().isThrownBy(() -> {
            InProgressContract.requireWorkedInProgress(ActorKind.AGENT, Executor.AI, Category.FEATURE,
                    Status.TODO, Status.DOING);
            InProgressContract.requireWorkedInProgress(ActorKind.AGENT, Executor.AI, Category.FEATURE,
                    Status.TODO, Status.REFINE);
            InProgressContract.requireWorkedInProgress(ActorKind.AGENT, Executor.AI, Category.FEATURE,
                    Status.DOING, Status.REVIEW);
        });
    }

    @Test
    void a_person_a_human_card_and_an_epic_are_not_gated() {
        assertThatNoException().isThrownBy(() -> {
            InProgressContract.requireWorkedInProgress(ActorKind.PERSON, Executor.AI, Category.FEATURE,
                    Status.TODO, Status.REVIEW);
            InProgressContract.requireWorkedInProgress(ActorKind.AGENT, Executor.HUMAN, Category.SPIKE,
                    Status.TODO, Status.READY);
            InProgressContract.requireWorkedInProgress(ActorKind.AGENT, Executor.AI, Category.EPIC,
                    Status.TODO, Status.REVIEW);
            InProgressContract.requireRunInProgress(ActorKind.PERSON, Executor.AI, Category.BUG, Status.TODO,
                    RunState.RUNNING);
        });
    }

    @Test
    void an_agent_cannot_start_a_run_in_to_do() {
        assertThatThrownBy(() -> InProgressContract.requireRunInProgress(ActorKind.AGENT, Executor.AI, null,
                Status.TODO, RunState.RUNNING))
                .isInstanceOf(OfficiumException.class)
                .hasMessageContaining("that move starts the run");
    }

    @Test
    void a_run_starts_in_any_other_status_and_ends_anywhere() {
        assertThatNoException().isThrownBy(() -> {
            for (Status status : new Status[]{Status.REFINE, Status.DOING, Status.READY, Status.REVIEW}) {
                InProgressContract.requireRunInProgress(ActorKind.AGENT, Executor.AI, Category.FEATURE, status,
                        RunState.RUNNING);
            }
            InProgressContract.requireRunInProgress(ActorKind.AGENT, Executor.AI, Category.FEATURE, Status.TODO,
                    RunState.IDLE);
            InProgressContract.requireRunInProgress(ActorKind.AGENT, Executor.AI, Category.FEATURE, Status.TODO,
                    RunState.COMPLETED);
        });
    }
}
