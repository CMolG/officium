package com.javadaba.contexts.officium.domain;

import com.javadaba.contexts.officium.domain.UnattendedHours.Span;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** card://JAVA-1047: unattended hours are the agent time no attended window overlaps, each moment once. */
class UnattendedHoursTest {

    private static final Instant NIGHT_START = Instant.parse("2026-10-20T00:00:00Z");
    private static final Span NIGHT = new Span(NIGHT_START, NIGHT_START.plus(Duration.ofHours(10)));

    private static Span hour(int from, int to) {
        return new Span(NIGHT_START.plus(Duration.ofHours(from)), NIGHT_START.plus(Duration.ofHours(to)));
    }

    @Test
    void anAgentSpanNoPersonWasAtTheKeyboardForIsAllUnattended() {
        assertThat(UnattendedHours.of(NIGHT, List.of())).isEqualTo(Duration.ofHours(10));
    }

    @Test
    void theAttendedPartIsSubtracted() {
        assertThat(UnattendedHours.of(NIGHT, List.of(hour(2, 4)))).isEqualTo(Duration.ofHours(8));
    }

    @Test
    void overlappingWindowsCountOnce() {
        assertThat(UnattendedHours.of(NIGHT, List.of(hour(2, 5), hour(4, 6)))).isEqualTo(Duration.ofHours(6));
    }

    @Test
    void aWindowOutsideTheSpanTakesNothingFromIt() {
        assertThat(UnattendedHours.of(hour(0, 1), List.of(hour(5, 9)))).isEqualTo(Duration.ofHours(1));
    }

    @Test
    void aSpanEndingBeforeItStartsIsRefused() {
        assertThatThrownBy(() -> new Span(NIGHT_START.plusSeconds(10), NIGHT_START))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
