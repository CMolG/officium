package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** JAVA-766: what a runner may post as a test run, and what it is refused with (its budget: JAVA-823). */
class TestRunTest {

    private static final UUID PROJECT = UUID.randomUUID();
    private static final Actor RUNNER = Actor.agent(UUID.randomUUID(), "Test runner");
    private static final Instant START = Instant.parse("2026-10-02T06:00:00Z");

    @Test
    void aRunKeepsItsSuitesInOrderAndSumsThem() {
        TestRun run = run(List.of(new TestRun.SuiteResult(" api ", true, 120.5),
                new TestRun.SuiteResult("landing-e2e", false, 80)));

        assertThat(run.suites()).extracting(TestRun.SuiteResult::name).containsExactly("api", "landing-e2e");
        assertThat(run.failed()).isEqualTo(1);
        assertThat(run.totalSeconds()).isEqualTo(200.5);
        assertThat(run.machine()).isEqualTo("Carlos");
    }

    @Test
    void aRunWithoutSuitesOrWithTheSameSuiteTwiceIsRefused() {
        assertThatThrownBy(() -> run(List.of())).hasMessageContaining("at least one suite");
        assertThatThrownBy(() -> run(List.of(new TestRun.SuiteResult("api", true, 1),
                new TestRun.SuiteResult("api", true, 2)))).hasMessageContaining("twice");
    }

    @Test
    void secondsOutsideZeroToADayAreRefused() {
        assertThatThrownBy(() -> run(List.of(new TestRun.SuiteResult("api", true, -1))))
                .isInstanceOf(OfficiumException.class);
        assertThatThrownBy(() -> run(List.of(new TestRun.SuiteResult("api", true, Double.NaN))))
                .isInstanceOf(OfficiumException.class);
        assertThatThrownBy(() -> run(List.of(new TestRun.SuiteResult("api", true, 90_000))))
                .isInstanceOf(OfficiumException.class);
    }

    @Test
    void aRunNeedsItsCommitAndItsStart() {
        List<TestRun.SuiteResult> suites = List.of(new TestRun.SuiteResult("api", true, 1));
        assertThatThrownBy(() -> TestRun.recorded(PROJECT, " ", "main", "m", START, null, null, suites, RUNNER, START))
                .hasMessageContaining("commit");
        assertThatThrownBy(() -> TestRun.recorded(PROJECT, "abc", "main", "m", null, null, null, suites, RUNNER, START))
                .hasMessageContaining("startedAt");
        assertThatThrownBy(() -> TestRun.recorded(PROJECT, "abc", "main", "m", START, START.minusSeconds(1), null,
                suites, RUNNER, START)).hasMessageContaining("finish before");
    }

    @Test
    void itsBytesAreItsTextAsTheAllowanceMeasuresIt() {
        TestRun run = run(List.of(new TestRun.SuiteResult("api", true, 1)));

        assertThat(run.bytes()).isEqualTo("abc123".length() + "main".length() + "Carlos".length() + "api".length());
    }

    @Test
    void aRunWithNoBudgetStillRecordsAndKeepsAPartialOne() {
        assertThat(run(List.of(new TestRun.SuiteResult("api", true, 1))).budget()).isEqualTo(TestRun.Budget.NONE);
        assertThat(run(new TestRun.Budget(null, 4, null)).budget()).isEqualTo(new TestRun.Budget(null, 4, null));
    }

    @Test
    void aBudgetValueBelowOneIsRefusedNamingTheField() {
        assertThatThrownBy(() -> run(new TestRun.Budget(1, 0, 4)))
                .isInstanceOfSatisfying(OfficiumException.class, ex -> {
                    assertThat(ex.code()).isEqualTo("invalid_budget");
                    assertThat(ex.httpStatus()).isEqualTo(400);
                    assertThat(ex.getMessage()).contains("jobs");
                });
        assertThatThrownBy(() -> run(new TestRun.Budget(-1, 1, 1))).hasMessageContaining("slots");
        assertThatThrownBy(() -> run(new TestRun.Budget(1, 1, 0))).hasMessageContaining("workers");
    }

    private static TestRun run(List<TestRun.SuiteResult> suites) {
        return TestRun.recorded(PROJECT, "abc123", "main", "Carlos", START, START.plusSeconds(300), null, suites,
                RUNNER, START.plusSeconds(301));
    }

    private static TestRun run(TestRun.Budget budget) {
        return TestRun.recorded(PROJECT, "abc123", "main", "Carlos", START, START.plusSeconds(300), budget,
                List.of(new TestRun.SuiteResult("api", true, 1)), RUNNER, START.plusSeconds(301));
    }
}
