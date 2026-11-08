package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1047: a report period is a UTC calendar month, its previous month beside it. */
class ReportPeriodTest {

    private static final ReportPeriod OCTOBER = new ReportPeriod(YearMonth.of(2026, 10));

    @Test
    void thePeriodRunsFromTheFirstInstantOfTheMonthUpToTheFirstOfTheNext() {
        assertThat(OCTOBER.start()).isEqualTo(Instant.parse("2026-10-01T00:00:00Z"));
        assertThat(OCTOBER.end()).isEqualTo(Instant.parse("2026-11-01T00:00:00Z"));
        assertThat(OCTOBER.contains(Instant.parse("2026-10-31T23:59:59Z"))).isTrue();
        assertThat(OCTOBER.contains(Instant.parse("2026-11-01T00:00:00Z"))).isFalse();
    }

    @Test
    void thePreviousMonthIsTheOneBeforeInTheCalendar() {
        assertThat(OCTOBER.previous()).isEqualTo(new ReportPeriod(YearMonth.of(2026, 9)));
        assertThat(new ReportPeriod(YearMonth.of(2026, 1)).previous())
                .isEqualTo(new ReportPeriod(YearMonth.of(2025, 12)));
    }
}
