package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CardRulesTest {

    @Test
    void a_human_card_refuses_a_runState_other_than_idle() {
        assertThatThrownBy(() -> CardRules.requireRunnable(Executor.HUMAN, RunState.RUNNING))
                .isInstanceOf(OfficiumException.class)
                .satisfies(ex -> assertThat(((OfficiumException) ex).code()).isEqualTo("human_card_not_runnable"));
    }

    @Test
    void a_human_card_accepts_idle() {
        CardRules.requireRunnable(Executor.HUMAN, RunState.IDLE);
    }

    @Test
    void an_ai_card_accepts_any_runState() {
        CardRules.requireRunnable(Executor.AI, RunState.RUNNING);
        CardRules.requireRunnable(Executor.AI, RunState.COMPLETED);
    }

    @Test
    void a_human_card_needs_at_least_one_assignee() {
        assertThatThrownBy(() -> CardRules.requireAssignee(Executor.HUMAN, List.of()))
                .isInstanceOf(OfficiumException.class)
                .satisfies(ex -> assertThat(((OfficiumException) ex).code()).isEqualTo("human_card_needs_assignee"));
    }

    @Test
    void an_ai_card_needs_no_assignee() {
        CardRules.requireAssignee(Executor.AI, List.of());
    }

    @Test
    void an_epic_is_not_planned_into_a_sprint() {
        assertThatThrownBy(() -> CardRules.requirePlannable(Category.EPIC, UUID.randomUUID()))
                .isInstanceOf(OfficiumException.class)
                .satisfies(ex -> assertThat(((OfficiumException) ex).code()).isEqualTo("epic_not_plannable"));
    }

    @Test
    void an_epic_may_go_back_to_the_backlog_and_any_other_card_into_a_sprint() {
        CardRules.requirePlannable(Category.EPIC, null);
        CardRules.requirePlannable(Category.FEATURE, UUID.randomUUID());
        CardRules.requirePlannable(null, UUID.randomUUID());
    }

    @Test
    void an_epic_never_runs_but_its_run_can_still_end() {
        assertThatThrownBy(() -> CardRules.requireWorkable(Category.EPIC, RunState.RUNNING))
                .isInstanceOf(OfficiumException.class)
                .satisfies(ex -> assertThat(((OfficiumException) ex).code()).isEqualTo("epic_not_workable"));
        CardRules.requireWorkable(Category.EPIC, RunState.IDLE);
        CardRules.requireWorkable(Category.EPIC, RunState.COMPLETED);
        CardRules.requireWorkable(Category.FEATURE, RunState.RUNNING);
        CardRules.requireWorkable(null, RunState.RUNNING);
    }

    @Test
    void a_childless_epic_may_only_go_to_refine_or_be_rejected() {
        assertThatThrownBy(() -> CardRules.requireMovable(Category.EPIC, 0, Status.TODO))
                .isInstanceOf(OfficiumException.class)
                .satisfies(ex -> assertThat(((OfficiumException) ex).code()).isEqualTo("epic_has_no_children"));
        CardRules.requireMovable(Category.EPIC, 0, Status.REFINE);
        CardRules.requireMovable(Category.EPIC, 0, Status.REJECTED);
        CardRules.requireMovable(Category.EPIC, 1, Status.TODO);
        CardRules.requireMovable(Category.FEATURE, 0, Status.DOING);
    }

    @Test
    void blocked_while_any_blocker_is_not_in_deploy() {
        assertThat(CardRules.isBlocked(List.of(Status.DOING))).isTrue();
        assertThat(CardRules.isBlocked(List.of(Status.DEPLOY))).isFalse();
        assertThat(CardRules.isBlocked(List.of(Status.DEPLOY, Status.REVIEW))).isTrue();
        assertThat(CardRules.isBlocked(List.of())).isFalse();
    }

    @Test
    void a_completed_blocker_blocks_nobody() {
        assertThat(CardRules.isBlocked(List.of(Status.DONE))).isFalse();
        assertThat(CardRules.isBlocked(List.of(Status.DONE, Status.DEPLOY))).isFalse();
        assertThat(CardRules.isBlocked(List.of(Status.DONE, Status.TODO))).isTrue();
    }

    @Test
    void only_deploy_and_done_are_finished() {
        assertThat(java.util.Arrays.stream(Status.values()).filter(Status::finished))
                .containsExactly(Status.DEPLOY, Status.DONE);
    }

    // card://JAVA-1415: a discarded blocker never passes for shipped work.
    @Test
    void a_rejected_blocker_keeps_blocking() {
        assertThat(CardRules.isBlocked(List.of(Status.REJECTED))).isTrue();
        assertThat(CardRules.isBlocked(List.of(Status.DONE, Status.REJECTED))).isTrue();
    }

    @Test
    void only_a_spike_takes_a_subtype() {
        assertThatThrownBy(() -> CardRules.requireSubtypeFits(Category.BUG, SpikeSubtype.UX_UI))
                .isInstanceOf(OfficiumException.class)
                .satisfies(ex -> assertThat(((OfficiumException) ex).code()).isEqualTo("subtype_not_allowed"));
        assertThatThrownBy(() -> CardRules.requireSubtypeFits(null, SpikeSubtype.TECHNICAL))
                .isInstanceOf(OfficiumException.class);
        CardRules.requireSubtypeFits(Category.SPIKE, SpikeSubtype.UX_UI);
        CardRules.requireSubtypeFits(Category.BUG, null);
    }

    // card://JAVA-1585: a spike closes at its review, it never waits in Deploy.
    @Test
    void a_spike_never_goes_to_deploy() {
        assertThatThrownBy(() -> CardRules.requireNotDeployed(Category.SPIKE, Status.DEPLOY))
                .isInstanceOf(OfficiumException.class)
                .satisfies(ex -> assertThat(((OfficiumException) ex).code()).isEqualTo("spike_skips_deploy"));
    }

    @Test
    void a_spike_goes_to_done_and_other_cards_to_deploy() {
        CardRules.requireNotDeployed(Category.SPIKE, Status.DONE);
        CardRules.requireNotDeployed(Category.FEATURE, Status.DEPLOY);
        CardRules.requireNotDeployed(null, Status.DEPLOY);
    }
}
