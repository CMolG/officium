package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SprintTest {

    private static final Instant NOW = Instant.parse("2026-09-24T10:00:00Z");

    private static Sprint planned() {
        return new Sprint(UUID.randomUUID(), UUID.randomUUID(), 1, "OFF Sprint 1", "", SprintState.PLANNED, null,
                null, null, null, 0, 1, NOW, NOW);
    }

    private static String codeOf(Runnable action) {
        try {
            action.run();
            return null;
        } catch (OfficiumException ex) {
            return ex.code();
        }
    }

    @Test
    void aSprintGoesPlannedThenActiveThenClosedAndNeverBack() {
        Sprint active = planned().started(LocalDate.of(2026, 9, 24), LocalDate.of(2026, 10, 8), NOW);
        assertThat(active.state()).isEqualTo(SprintState.ACTIVE);
        assertThat(active.startedAt()).isEqualTo(NOW);
        assertThat(active.version()).isEqualTo(2);

        Sprint closed = active.completed(NOW.plusSeconds(60));
        assertThat(closed.state()).isEqualTo(SprintState.CLOSED);
        assertThat(closed.closedAt()).isEqualTo(NOW.plusSeconds(60));

        assertThat(codeOf(() -> active.started(null, null, NOW))).isEqualTo("sprint_not_planned");
        assertThat(codeOf(() -> planned().completed(NOW))).isEqualTo("sprint_not_active");
        assertThat(codeOf(() -> closed.completed(NOW))).isEqualTo("sprint_not_active");
    }

    @Test
    void onlyAPlannedSprintIsDeletedAndAClosedOneTakesNoMoreCards() {
        Sprint active = planned().started(null, null, NOW);
        assertThat(codeOf(planned()::requireDeletable)).isNull();
        assertThat(codeOf(active::requireDeletable)).isEqualTo("sprint_not_planned");
        assertThat(codeOf(active::requireOpen)).isNull();
        assertThat(codeOf(active.completed(NOW)::requireOpen)).isEqualTo("sprint_closed");
    }

    @Test
    void itCantEndBeforeItStartsAndItNeedsAName() {
        assertThatThrownBy(() -> planned().edited(null, null, LocalDate.of(2026, 10, 8), LocalDate.of(2026, 10, 1),
                NOW)).isInstanceOf(OfficiumException.class).hasMessageContaining("end before");
        assertThat(codeOf(() -> planned().edited("  ", null, null, null, NOW))).isEqualTo("name_required");
    }
}
