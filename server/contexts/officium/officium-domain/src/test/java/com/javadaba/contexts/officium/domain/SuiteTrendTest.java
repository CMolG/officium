package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** JAVA-766: when a suite reads as getting slower, and when it is only noise (contract §8.12). */
class SuiteTrendTest {

    private static final Instant T0 = Instant.parse("2026-10-01T00:00:00Z");
    /** A solo run on a 16-thread machine: one slot, 4 suites at once, 4 workers each. */
    private static final TestRun.Budget SOLO = new TestRun.Budget(1, 4, 4);
    /** The same machine as one of three autoloop slots: a third of the workers. */
    private static final TestRun.Budget SLOT = new TestRun.Budget(3, 1, 2);

    @Test
    void aSuiteWellAboveItsRecentMedianIsGrowing() {
        // Latest 130 s against a median of 100 s: over 125% and 30 s above.
        SuiteTrend trend = SuiteTrend.of("landing-e2e", newestFirst(130, 100, 98, 102, 100, 101, 99));

        assertThat(trend.median()).isEqualTo(100.0);
        assertThat(trend.growing()).isTrue();
        assertThat(trend.latest().seconds()).isEqualTo(130);
    }

    @Test
    void aSmallSuiteIsNeverAlarmedBySecondsOfNoise() {
        // 6 s against 3 s is 200%, but only 3 s above: below the 10-second floor.
        assertThat(SuiteTrend.of("scripts", newestFirst(6, 3, 3, 3, 3, 3)).growing()).isFalse();
    }

    @Test
    void justAtTheThresholdIsNotGrowing() {
        // 125 s against 100 s is exactly 125%: "over" means strictly over.
        assertThat(SuiteTrend.of("api", newestFirst(125, 100, 100, 100, 100, 100)).growing()).isFalse();
        assertThat(SuiteTrend.of("api", newestFirst(126, 100, 100, 100, 100, 100)).growing()).isTrue();
    }

    @Test
    void withFewerThanFiveEarlierRunsThereIsNoVerdict() {
        SuiteTrend trend = SuiteTrend.of("api", newestFirst(500, 100, 100, 100, 100));

        assertThat(trend.median()).isEqualTo(100.0);
        assertThat(trend.growing()).isFalse();
    }

    @Test
    void aFailedRunIsShownButNeverMeasured() {
        // The newest run failed after 20 s: fast for the wrong reason. The verdict compares the latest
        // PASSING run (101 s) with the passing runs before it.
        List<SuiteTrend.Point> points = new ArrayList<>(newestFirst(101, 100, 100, 100, 100, 100));
        points.add(0, point("dead", 1, false, 20, SOLO));

        SuiteTrend trend = SuiteTrend.of("api", points);

        assertThat(trend.latest().ok()).isFalse();
        assertThat(trend.median()).isEqualTo(100.0);
        assertThat(trend.growing()).isFalse();
        assertThat(trend.points()).hasSize(7);
    }

    @Test
    void onlyTheLastTenEarlierRunsFormTheMedianSoAnAcceptedSlowdownBecomesTheNewNormal() {
        // Ten runs at 200 s after an old era at 100 s: 210 s is normal now.
        List<SuiteTrend.Point> points = newestFirst(210, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 100,
                100, 100);

        SuiteTrend trend = SuiteTrend.of("api", points);

        assertThat(trend.median()).isEqualTo(200.0);
        assertThat(trend.growing()).isFalse();
    }

    @Test
    void aSuiteThatNeverPassedHasNoMedian() {
        SuiteTrend trend = SuiteTrend.of("api", List.of(point("a", 0, false, 30, SOLO)));

        assertThat(trend.median()).isNull();
        assertThat(trend.growing()).isFalse();
        assertThat(trend.basis()).isNull();
        assertThat(trend.compared()).isZero();
    }

    // card://JAVA-823: a slot's run has a third of the workers, so it is slower with no suite slower.
    @Test
    void aSlotRunAfterSoloRunsIsNotComparedWithThemAndSaysSo() {
        List<SuiteTrend.Point> points = new ArrayList<>(newestFirst(100, 100, 100, 100, 100, 100));
        points.add(0, point("slot", 1, true, 180, SLOT));

        SuiteTrend trend = SuiteTrend.of("landing-e2e", points);

        assertThat(trend.growing()).isFalse();
        assertThat(trend.compared()).isZero();
        assertThat(trend.median()).isNull();
        assertThat(trend.basis()).isEqualTo(new SuiteTrend.Basis("Carlos", 3, 1, 2));
        assertThat(trend.points()).hasSize(7);
    }

    @Test
    void aSlowSlotRunAfterSixSlotRunsIsGrowingWhateverTheSoloRunsBetweenThem() {
        // Slot runs at 180 s interleaved with solo runs at 100 s: the solo ones never enter the median.
        List<SuiteTrend.Point> points = new ArrayList<>();
        points.add(point("slow-slot", 0, true, 240, SLOT));
        for (int i = 0; i < 6; i++) {
            points.add(point("slot" + i, -2 * i - 1, true, 180, SLOT));
            points.add(point("solo" + i, -2 * i - 2, true, 100, SOLO));
        }

        SuiteTrend trend = SuiteTrend.of("landing-e2e", points);

        assertThat(trend.median()).isEqualTo(180.0);
        assertThat(trend.compared()).isEqualTo(6);
        assertThat(trend.growing()).isTrue();
    }

    @Test
    void runsRecordedWithNoBudgetNeverEnterANewRunsMedian() {
        // Six old runs at 300 s with no budget (before JAVA-823), then six budgeted runs at 100 s.
        List<SuiteTrend.Point> points = new ArrayList<>(newestFirst(100, 100, 100, 100, 100, 100));
        for (int i = 0; i < 6; i++) {
            points.add(point("old" + i, -10 - i, true, 300, TestRun.Budget.NONE));
        }

        SuiteTrend trend = SuiteTrend.of("api", points);

        assertThat(trend.compared()).isEqualTo(5);
        assertThat(trend.median()).isEqualTo(100.0);

        // And an old run measured alone compares only with the old ones.
        SuiteTrend old = SuiteTrend.of("api", points.subList(6, 12));
        assertThat(old.basis()).isEqualTo(new SuiteTrend.Basis("Carlos", null, null, null));
        assertThat(old.compared()).isEqualTo(5);
        assertThat(old.median()).isEqualTo(300.0);
    }

    @Test
    void anotherMachineWithTheSameBudgetIsNotCompared() {
        List<SuiteTrend.Point> points = new ArrayList<>(newestFirst(100, 100, 100, 100, 100, 100));
        points.add(0, new SuiteTrend.Point("laptop", T0.plusSeconds(3600), true, 200, "Laptop", 1, 4, 4));

        SuiteTrend trend = SuiteTrend.of("api", points);

        assertThat(trend.compared()).isZero();
        assertThat(trend.growing()).isFalse();
    }

    /** Passing solo points on machine "Carlos", the first argument the newest, an hour apart. */
    private static List<SuiteTrend.Point> newestFirst(double... seconds) {
        List<SuiteTrend.Point> points = new ArrayList<>();
        for (int i = 0; i < seconds.length; i++) {
            points.add(point("c" + i, -i, true, seconds[i], SOLO));
        }
        return points;
    }

    /** A point on machine "Carlos", {@code hour} hours from {@code T0}. */
    private static SuiteTrend.Point point(String ref, int hour, boolean ok, double seconds, TestRun.Budget budget) {
        return new SuiteTrend.Point(ref, T0.plusSeconds(3600L * hour), ok, seconds, "Carlos", budget.slots(),
                budget.jobs(), budget.workers());
    }
}
