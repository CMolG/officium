package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Whether a suite is getting slower (JAVA-766, contract §8.12). One run says nothing: a suite's time
 * moves with the machine's load. A trend does, so the latest PASSING run is compared with the median
 * of the passing runs before it.
 *
 * <p>It is flagged as {@code growing} only when all three hold, so noise never reads as a regression:
 * <ul>
 *   <li>there are at least {@value #MIN_HISTORY} earlier passing runs to compare with;</li>
 *   <li>the latest is more than {@value #RATIO_PERCENT}% of that median;</li>
 *   <li>and at least {@value #MIN_DELTA_SECONDS} seconds above it, so a 2-second suite that takes 3
 *   is not an alarm.</li>
 * </ul>
 * The median looks at the last {@value #WINDOW} earlier passing runs: old enough to be stable, recent
 * enough that an accepted slowdown becomes the new normal instead of warning forever. A failing run
 * is shown but never measured: a suite that died early is fast for the wrong reason.
 *
 * <p>Only runs made the same way are compared (JAVA-823): the same machine and the same
 * {@link TestRun.Budget}, its {@link Basis}. An autoloop slot's run gets a share of the workers a solo
 * run gets, so against a solo median it would read as growing with no suite slower. {@code compared}
 * is how many earlier runs the median used; with fewer than {@value #MIN_HISTORY} there is no verdict,
 * and {@code compared} says why. Runs recorded before the budget existed form their own basis.
 */
public record SuiteTrend(String suite, Point latest, Double median, boolean growing, Basis basis, int compared,
        List<Point> points) {

    public static final int WINDOW = 10;
    public static final int MIN_HISTORY = 5;
    public static final int RATIO_PERCENT = 125;
    public static final int MIN_DELTA_SECONDS = 10;

    public SuiteTrend {
        Objects.requireNonNull(suite, "suite");
        points = List.copyOf(points);
    }

    /** One run of the suite, with the machine and budget it ran on. */
    public record Point(String ref, Instant startedAt, boolean ok, double seconds, String machine, Integer slots,
            Integer jobs, Integer workers) {

        Basis basis() {
            return new Basis(machine, slots, jobs, workers);
        }
    }

    /** What makes two runs comparable: equal on all four, nulls included. */
    public record Basis(String machine, Integer slots, Integer jobs, Integer workers) {
    }

    /** {@code points} newest first, as the repository returns them. */
    public static SuiteTrend of(String suite, List<Point> points) {
        List<Point> passing = points.stream().filter(Point::ok).toList();
        Point latest = points.isEmpty() ? null : points.get(0);
        if (passing.isEmpty()) {
            return new SuiteTrend(suite, latest, null, false, null, 0, points);
        }
        Point measured = passing.get(0);
        Basis basis = measured.basis();
        List<Point> before = passing.stream().skip(1).filter(point -> point.basis().equals(basis)).limit(WINDOW)
                .toList();
        Double median = before.isEmpty() ? null : median(before);
        boolean growing = before.size() >= MIN_HISTORY
                && measured.seconds() * 100 > median * RATIO_PERCENT
                && measured.seconds() - median >= MIN_DELTA_SECONDS;
        return new SuiteTrend(suite, latest, median, growing, basis, before.size(), points);
    }

    private static double median(List<Point> points) {
        List<Double> seconds = new ArrayList<>(points.stream().map(Point::seconds).toList());
        seconds.sort(Double::compare);
        int middle = seconds.size() / 2;
        return seconds.size() % 2 == 1 ? seconds.get(middle) : (seconds.get(middle - 1) + seconds.get(middle)) / 2;
    }
}
