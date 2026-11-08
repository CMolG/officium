package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1804 (E11): the bar is kept as set, within 0.05 to 1 and at most three decimals, or it is refused. */
class ProfileRecommendationSettingsTest {

    @Test
    void theEdgesOfTheRangeAndAStoredBarAreKeptAsSet() {
        assertThat(new ProfileRecommendationSettings(0.05).raiseAt()).isEqualTo(0.05);
        assertThat(new ProfileRecommendationSettings(1.0).raiseAt()).isEqualTo(1.0);
        assertThat(ProfileRecommendationSettings.of(0.5).raiseAt()).isEqualTo(0.5);
    }

    @Test
    void aMissingBarIsTheDefault() {
        assertThat(ProfileRecommendationSettings.of(null)).isEqualTo(ProfileRecommendationSettings.DEFAULTS);
        assertThat(ProfileRecommendationSettings.DEFAULTS.raiseAt()).isEqualTo(0.30);
    }

    @Test
    void aBarOutsideTheRangeOrFinerThanThreeDecimalsIsRefused() {
        for (double refused : new double[]{0.04, 1.01, 0.3333, Double.NaN}) {
            assertThatThrownBy(() -> new ProfileRecommendationSettings(refused))
                    .hasMessageContaining("raiseAt");
        }
    }
}
