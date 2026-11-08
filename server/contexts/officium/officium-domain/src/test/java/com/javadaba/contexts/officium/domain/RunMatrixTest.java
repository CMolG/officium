package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** JAVA-915: the model and effort every cell of the role matrix is worked with. */
class RunMatrixTest {

    private static final RoleMatrix DEFAULTS = RoleMatrix.defaults();
    private static final RunConfig OPUS_XHIGH = RunConfig.of("claude-opus-5-5", "xhigh");
    private static final RunConfig OPUS_HIGH = RunConfig.of("claude-opus-5-5", "high");
    private static final RunConfig SONNET_MEDIUM = RunConfig.of("claude-sonnet-5-5", "medium");

    @Test
    void planningAndCheckingReasonOnOpusAndWorkAndClosingRunOnSonnet() {
        assertThat(DEFAULTS.runConfig(Category.FEATURE, null, Status.REFINE)).contains(OPUS_XHIGH);
        assertThat(DEFAULTS.runConfig(Category.FEATURE, null, Status.TODO)).contains(SONNET_MEDIUM);
        assertThat(DEFAULTS.runConfig(Category.FEATURE, null, Status.DOING)).contains(SONNET_MEDIUM);
        assertThat(DEFAULTS.runConfig(Category.FEATURE, null, Status.READY)).contains(OPUS_HIGH);
        assertThat(DEFAULTS.runConfig(Category.FEATURE, null, Status.REVIEW)).contains(OPUS_HIGH);
        assertThat(DEFAULTS.runConfig(Category.FEATURE, null, Status.DEPLOY)).contains(SONNET_MEDIUM);
    }

    @Test
    void researchSecurityWorkAndADocumentationReviewDeviateFromTheirPhase() {
        assertThat(DEFAULTS.runConfig(Category.SPIKE, null, Status.DOING)).contains(OPUS_HIGH);
        assertThat(DEFAULTS.runConfig(Category.SPIKE, SpikeSubtype.UX_UI, Status.DOING)).contains(OPUS_HIGH);
        assertThat(DEFAULTS.runConfig(Category.SECURITY, null, Status.TODO)).contains(OPUS_HIGH);
        assertThat(DEFAULTS.runConfig(Category.DOCUMENTATION, null, Status.REVIEW)).contains(SONNET_MEDIUM);
        assertThat(DEFAULTS.runConfig(Category.DOCUMENTATION, null, Status.REFINE)).contains(OPUS_XHIGH);
    }

    @Test
    void everyEligibleRoleGetsItsCardsCellIncludingTheOnesASignalAdds() {
        Map<String, RunConfig> byRole = DEFAULTS.runConfigs(Category.FEATURE, null, Status.TODO,
                List.of(Signal.TOUCHES_DATA_SCHEMA));

        assertThat(byRole.keySet()).containsExactlyElementsOf(
                DEFAULTS.eligible(Category.FEATURE, null, Status.TODO, List.of(Signal.TOUCHES_DATA_SCHEMA)));
        assertThat(byRole.values()).containsOnly(SONNET_MEDIUM);
    }

    @Test
    void aDoneOrUncategorizedCardHasNoRunConfig() {
        assertThat(DEFAULTS.runConfig(Category.FEATURE, null, Status.DONE)).isEmpty();
        assertThat(DEFAULTS.runConfigs(Category.FEATURE, null, Status.DONE, List.of())).isEmpty();
        assertThat(DEFAULTS.runConfig(null, null, Status.TODO)).isEmpty();
        assertThat(DEFAULTS.runConfigs(null, null, Status.TODO, List.of(Signal.TOUCHES_UI))).isEmpty();
    }

    @Test
    void aRoleOverrideInsideACellBeatsTheCellAndAnOverriddenCellReplacesTheDefaultsWhole() {
        RunConfig haiku = RunConfig.of("claude-haiku-4-5", "low");
        RoleMatrix override = RoleMatrix.fromWire(null, null, Map.of("bug", Map.of("action",
                Map.of("model", "claude-opus-5-5", "effort", "max",
                        "roles", Map.of("test-automation-engineer", Map.of("model", "claude-haiku-4-5",
                                "effort", "low"))))));
        RoleMatrix effective = DEFAULTS.overlay(override);

        Map<String, RunConfig> byRole = effective.runConfigs(Category.BUG, null, Status.TODO, List.of());
        assertThat(byRole.get("test-automation-engineer")).isEqualTo(haiku);
        assertThat(byRole.get("backend-developer")).isEqualTo(RunConfig.of("claude-opus-5-5", "max"));
        assertThat(effective.runConfig(Category.BUG, null, Status.REVIEW)).contains(OPUS_HIGH);
        assertThat(effective.runConfig(Category.FEATURE, null, Status.TODO)).contains(SONNET_MEDIUM);
        assertThat(effective.eligible(Category.BUG, null, Status.TODO, List.of()))
                .isEqualTo(DEFAULTS.eligible(Category.BUG, null, Status.TODO, List.of()));
    }

    @Test
    void theRunCellsReadBackFromTheirWireShape() {
        RunMatrix runs = RunMatrix.fromWire(Map.of("spike/ux-ui", Map.of("review",
                Map.of("model", "claude-sonnet-5-5", "effort", "high",
                        "roles",
                        Map.of("findings-evaluator", Map.of("model", "claude-opus-5-5", "effort", "xhigh"))))));

        @SuppressWarnings("unchecked")
        Map<String, Map<String, Object>> wire = (Map<String, Map<String, Object>>) (Map<?, ?>) runs.toWire();
        assertThat(RunMatrix.fromWire(wire)).isEqualTo(runs);
        assertThat(wire.get("spike/ux-ui").get("review")).isEqualTo(Map.of("model", "claude-sonnet-5-5",
                "effort", "high", "roles", Map.of("findings-evaluator",
                        Map.of("model", "claude-opus-5-5", "effort", "xhigh"))));
    }

    @Test
    void aMalformedRunCellIsRefused() {
        assertThatThrownBy(() -> RunMatrix.fromWire(Map.of("chore", Map.of())))
                .hasMessageContaining("Unknown category row");
        assertThatThrownBy(() -> RunMatrix.fromWire(Map.of("bug", Map.of("qa", Map.of()))))
                .hasMessageContaining("Unknown phase");
        assertThatThrownBy(() -> RunMatrix.fromWire(Map.of("bug", Map.of("action",
                Map.of("model", "Claude Opus", "effort", "high")))))
                .hasMessageContaining("lower-case id");
        assertThatThrownBy(() -> RunMatrix.fromWire(Map.of("bug", Map.of("action",
                Map.of("model", "claude-opus-5-5", "effort", "extreme")))))
                .hasMessageContaining("low, medium, high, xhigh or max");
        assertThatThrownBy(() -> RunMatrix.fromWire(Map.of("bug", Map.of("action",
                Map.of("model", "claude-opus-5-5", "effort", "high",
                        "roles", Map.of("Code Reviewer", Map.of("model", "claude-opus-5-5", "effort", "high")))))))
                .hasMessageContaining("kebab-case");
        assertThatThrownBy(() -> RunMatrix.fromWire(Map.of("bug", Map.of("action", "opus"))))
                .hasMessageContaining("{model, effort}");
    }
}
