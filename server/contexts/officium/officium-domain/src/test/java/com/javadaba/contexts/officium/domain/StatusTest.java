package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1415: rejected is closed like done, but never finished, and asks for no phase. */
class StatusTest {

    @Test
    void onlyDoneAndRejectedAreClosed() {
        assertThat(Arrays.stream(Status.values()).filter(Status::closed)).containsExactly(Status.DONE, Status.REJECTED);
    }

    @Test
    void aRejectedCardIsNotFinishedSoItKeepsBlocking() {
        assertThat(Status.REJECTED.finished()).isFalse();
    }

    @Test
    void aRejectedCardAsksForNoPhaseAndWaitsOnNobody() {
        assertThat(Phase.of(Status.REJECTED)).isEmpty();
        assertThat(Status.REJECTED.needsPerson()).isFalse();
    }

    @Test
    void rejectedIsDeclaredLastSoTheBoardOrderAndCompletedKeepTheirPlace() {
        assertThat(Status.values()[6]).isEqualTo(Status.DONE);
        assertThat(Status.values()[7]).isEqualTo(Status.REJECTED);
        assertThat(Status.fromWire("rejected")).isEqualTo(Status.REJECTED);
    }
}
