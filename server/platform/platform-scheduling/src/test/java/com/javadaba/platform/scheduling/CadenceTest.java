package com.javadaba.platform.scheduling;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CadenceTest {

    private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");

    @Test
    void an_interval_job_shares_its_slot_with_any_tick_inside_the_same_bucket() {
        Cadence fiveMinutes = Cadence.every(Duration.ofMinutes(5));

        assertThat(fiveMinutes.slotAt(Instant.parse("2026-10-01T10:02:17Z")))
                .isEqualTo(fiveMinutes.slotAt(Instant.parse("2026-10-01T10:04:51Z")))
                .isEqualTo("2026-10-01T10:00:00Z");
        assertThat(fiveMinutes.slotAt(Instant.parse("2026-10-01T10:05:00Z"))).isEqualTo("2026-10-01T10:05:00Z");
        assertThat(fiveMinutes.period()).isEqualTo(Duration.ofMinutes(5));
    }

    @Test
    void a_daily_job_is_still_in_yesterdays_slot_until_its_local_time() {
        Cadence at0415 = Cadence.dailyCron("0 15 4 * * ?", MADRID);

        // 04:14 and 04:15 in Madrid (CEST, UTC+2) on 2026-10-01.
        assertThat(at0415.slotAt(Instant.parse("2026-10-01T02:14:59Z"))).isEqualTo("2026-09-30");
        assertThat(at0415.slotAt(Instant.parse("2026-10-01T02:15:00Z"))).isEqualTo("2026-10-01");
        assertThat(at0415.slotAt(Instant.parse("2026-10-01T21:59:59Z"))).isEqualTo("2026-10-01");
        assertThat(at0415.period()).isEqualTo(Duration.ofDays(1));
    }

    @Test
    void only_the_daily_cron_form_is_accepted() {
        assertThat(Cadence.dailyCron("0 30 6 * * *", MADRID)).isInstanceOf(Cadence.Daily.class);
        assertThatThrownBy(() -> Cadence.dailyCron("0 0/5 * * * ?", MADRID))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Cadence.dailyCron("0 0 5 ? * MON", MADRID))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Cadence.dailyCron("0 0 5 * *", MADRID)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Cadence.every(Duration.ZERO)).isInstanceOf(IllegalArgumentException.class);
    }
}
