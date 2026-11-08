package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1803: the prior-failure settings default when a project leaves them out, and are refused when out of range. */
class PriorFailureSettingsTest {

    @Test
    void aProjectWithoutSettingsGetsTheDefaults() {
        assertThat(PriorFailureSettings.of(null, null, null, null)).isEqualTo(new PriorFailureSettings(14, 5, 8, 3));
    }

    @Test
    void aPartialSettingKeepsTheRestAtTheirDefaults() {
        assertThat(PriorFailureSettings.of(30, null, 12, null)).isEqualTo(new PriorFailureSettings(30, 5, 12, 3));
    }

    @Test
    void theBoundsAreInclusive() {
        assertThat(new PriorFailureSettings(1, 1, 1, 2)).isNotNull();
        assertThat(new PriorFailureSettings(90, 20, 40, 50)).isNotNull();
    }

    @Test
    void aValueOutOfItsRangeIsRefusedNamingTheField() {
        assertThatThrownBy(() -> PriorFailureSettings.of(0, null, null, null))
                .isInstanceOfSatisfying(OfficiumException.class, e -> {
                    assertThat(e.code()).isEqualTo("invalid_prior_failure_settings");
                    assertThat(e.getMessage()).contains("windowDays");
                });
        assertThatThrownBy(() -> PriorFailureSettings.of(null, 21, null, null))
                .isInstanceOf(OfficiumException.class).hasMessageContaining("maxCards");
        assertThatThrownBy(() -> PriorFailureSettings.of(null, null, 41, null))
                .isInstanceOf(OfficiumException.class).hasMessageContaining("maxFindings");
        assertThatThrownBy(() -> PriorFailureSettings.of(null, null, null, 1))
                .isInstanceOf(OfficiumException.class).hasMessageContaining("recurrenceThreshold");
    }
}
