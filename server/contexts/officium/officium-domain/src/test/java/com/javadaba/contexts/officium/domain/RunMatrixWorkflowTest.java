package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1591: the run cell a card's workflow is worked with defaults to Opus at max, in refine only. */
class RunMatrixWorkflowTest {

    private static final RunConfig OPUS_MAX = RunConfig.of("claude-opus-5-5", "max");

    @Test
    void theWorkflowCellDefaultsToOpusAtMaxAndIsNotACategoryRow() {
        assertThat(RoleMatrix.defaults().runs().resolve(RunMatrix.WORKFLOW, Phase.REFINE, null)).contains(OPUS_MAX);
        assertThat(RoleMatrix.rowKeys()).doesNotContain(RunMatrix.WORKFLOW);
    }

    @Test
    void anOverrideAcceptsTheRefineCellOnlyAndRoundTripsTheWire() {
        RunMatrix override = RunMatrix.fromWire(Map.of(RunMatrix.WORKFLOW, Map.of("refine",
                Map.of("model", "claude-sonnet-5-5", "effort", "high"))));

        assertThat(override.resolve(RunMatrix.WORKFLOW, Phase.REFINE, null))
                .contains(RunConfig.of("claude-sonnet-5-5", "high"));
        assertThat(override.toWire()).containsKey(RunMatrix.WORKFLOW);
    }

    @Test
    void aWorkflowCellOutsideRefineIsRefused() {
        assertThatThrownBy(() -> RunMatrix.fromWire(Map.of(RunMatrix.WORKFLOW, Map.of("action",
                Map.of("model", "claude-sonnet-5-5", "effort", "high")))))
                .hasMessageContaining("The workflow row only has a refine cell");
    }
}
