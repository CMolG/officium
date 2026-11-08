package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1524: what Claude Standard and Claude Eco give each cell of the matrix. */
class WorkProfilesTest {

    private static RunConfig run(WorkProfile profile, Category category, Status status) {
        return profile.matrix().runConfig(category, null, status).orElseThrow();
    }

    @Test
    void standardIsOfficiumsDefaultsAsTheyAre() {
        WorkProfile standard = WorkProfiles.builtin(WorkProfiles.STANDARD).orElseThrow();

        assertThat(standard.builtin()).isTrue();
        Map<String, Object> wire = new java.util.LinkedHashMap<>(standard.matrix().toWire());
        wire.remove("mods");
        Map<String, Object> defaults = new java.util.LinkedHashMap<>(RoleMatrix.defaults().toWire());
        defaults.remove("mods");
        assertThat(wire).isEqualTo(defaults);
    }

    @Test
    void standardMountsTheRuleEnforcerOnEveryReviewCellAndNowhereElse() {
        RoleMatrix matrix = WorkProfiles.builtin(WorkProfiles.STANDARD).orElseThrow().matrix();

        for (Category category : Category.values()) {
            assertThat(matrix.cellMods(category, null, Status.REVIEW, List.of())).containsExactly("rule-enforcer");
            assertThat(matrix.cellMods(category, null, Status.DOING, List.of())).isEmpty();
        }
        assertThat(WorkProfiles.builtin(WorkProfiles.ECO).orElseThrow().matrix()
                .cellMods(Category.BUG, null, Status.REVIEW, List.of())).isEmpty();
    }

    @Test
    void ecoPlansOnOpusAtHighAndRunsEveryOtherPhaseOnSonnetSavingByEffort() {
        WorkProfile eco = WorkProfiles.builtin(WorkProfiles.ECO).orElseThrow();

        for (Category category : Category.values()) {
            assertThat(run(eco, category, Status.REFINE)).as(category.wire())
                    .isEqualTo(new RunConfig("claude-opus-5-5", Effort.HIGH));
        }
        assertThat(run(eco, Category.FEATURE, Status.TODO))
                .isEqualTo(new RunConfig("claude-sonnet-5-5", Effort.MEDIUM));
        assertThat(run(eco, Category.BUG, Status.DOING)).isEqualTo(new RunConfig("claude-sonnet-5-5", Effort.MEDIUM));
        assertThat(run(eco, Category.FEATURE, Status.READY)).isEqualTo(new RunConfig("claude-sonnet-5-5", Effort.HIGH));
        assertThat(run(eco, Category.DOCUMENTATION, Status.REVIEW))
                .isEqualTo(new RunConfig("claude-sonnet-5-5", Effort.HIGH));
        assertThat(run(eco, Category.FEATURE, Status.DEPLOY))
                .isEqualTo(new RunConfig("claude-sonnet-5-5", Effort.LOW));
    }

    @Test
    void ecoKeepsSonnetWhereBuildingIsResearchOrSecurity() {
        WorkProfile eco = WorkProfiles.builtin(WorkProfiles.ECO).orElseThrow();
        RunConfig high = new RunConfig("claude-sonnet-5-5", Effort.HIGH);

        assertThat(run(eco, Category.SPIKE, Status.DOING)).isEqualTo(high);
        assertThat(run(eco, Category.SECURITY, Status.TODO)).isEqualTo(high);
        assertThat(eco.matrix().runConfig(Category.SPIKE, SpikeSubtype.UX_UI, Status.DOING)).contains(high);
    }

    @Test
    void ecoChangesModelsOnlyNeverWhoWorksACard() {
        WorkProfile eco = WorkProfiles.builtin(WorkProfiles.ECO).orElseThrow();

        assertThat(eco.matrix().eligible(Category.BUG, null, Status.REVIEW, List.of()))
                .isEqualTo(RoleMatrix.defaults().eligible(Category.BUG, null, Status.REVIEW, List.of()));
    }

    @Test
    void anIdIsKebabCaseAndANameIsShort() {
        assertThat(WorkProfile.requireId("my-cheap-profile")).isEqualTo("my-cheap-profile");
        assertThatThrownBy(() -> WorkProfile.requireId("My Profile")).isInstanceOfSatisfying(OfficiumException.class,
                ex -> assertThat(ex.code()).isEqualTo("invalid_profile_id"));
        assertThatThrownBy(() -> WorkProfile.requireName("  ")).isInstanceOfSatisfying(OfficiumException.class,
                ex -> assertThat(ex.code()).isEqualTo("invalid_profile_name"));
    }
}
