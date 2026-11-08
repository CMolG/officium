package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * One full run of a project's test suites, as its runner reported it (JAVA-766, contract §8.12):
 * which commit, on which branch and machine, and per suite whether it passed and how long it took.
 * Kept so a suite that gets a few seconds slower every week shows up as a trend ({@link SuiteTrend})
 * instead of staying invisible run by run.
 *
 * <p>{@code (machine, startedAt)} is the run's identity inside the project, so a runner that retries
 * its post never records the run twice. Its {@link Budget} says how it ran, so its trend is measured
 * only against runs made the same way (JAVA-823).
 */
public record TestRun(UUID id, UUID projectId, String ref, String branch, String machine, Instant startedAt,
        Instant finishedAt, Budget budget, List<SuiteResult> suites, Actor recordedBy, Instant recordedAt) {

    public static final int MAX_REF_LENGTH = 100;
    public static final int MAX_BRANCH_LENGTH = 200;
    public static final int MAX_MACHINE_LENGTH = 100;
    public static final int MAX_SUITES = 100;
    public static final int MAX_SUITE_NAME_LENGTH = 100;
    /** A day: a suite that runs longer than this is a hang, not a measurement. */
    public static final double MAX_SECONDS = 86_400;

    public TestRun {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(projectId, "projectId");
        Objects.requireNonNull(ref, "ref");
        Objects.requireNonNull(machine, "machine");
        Objects.requireNonNull(startedAt, "startedAt");
        Objects.requireNonNull(recordedBy, "recordedBy");
        budget = budget == null ? Budget.NONE : budget;
        suites = List.copyOf(suites);
    }

    /**
     * How the runner shared the machine (JAVA-823): {@code slots} worktrees running their own suites
     * at once (the autoloop's, 1 outside it), {@code jobs} suites at once, {@code workers} Playwright
     * workers per suite. A slot's run gets a third of a solo run's workers, so it is slower without
     * any suite getting slower. Each is null when the runner did not say: a run recorded before
     * JAVA-823, or a hand-set worker count that is not a number.
     */
    public record Budget(Integer slots, Integer jobs, Integer workers) {

        public static final Budget NONE = new Budget(null, null, null);

        /** Refuses a value below 1, naming the field, so a malformed post is not half stored. */
        public static Budget of(Integer slots, Integer jobs, Integer workers) {
            return new Budget(atLeastOne(slots, "slots"), atLeastOne(jobs, "jobs"), atLeastOne(workers, "workers"));
        }

        private static Integer atLeastOne(Integer value, String field) {
            if (value != null && value < 1) {
                throw OfficiumException.badRequest("invalid_budget",
                        "A run's " + field + " is at least 1, or left out");
            }
            return value;
        }
    }

    /** How one suite did in the run. {@code seconds} is its wall time. */
    public record SuiteResult(String name, boolean ok, double seconds) {

        public SuiteResult {
            Objects.requireNonNull(name, "name");
        }
    }

    /**
     * A run as a runner reports it. Everything is checked here, so a malformed post is refused with
     * the field it got wrong instead of being half stored.
     */
    public static TestRun recorded(UUID projectId, String ref, String branch, String machine, Instant startedAt,
            Instant finishedAt, Budget budget, List<SuiteResult> suites, Actor actor, Instant now) {
        if (startedAt == null) {
            throw OfficiumException.badRequest("started_at_required", "A run needs startedAt, the moment it began");
        }
        if (finishedAt != null && finishedAt.isBefore(startedAt)) {
            throw OfficiumException.badRequest("invalid_finished_at", "A run cannot finish before it starts");
        }
        return new TestRun(UUID.randomUUID(), projectId, requireText(ref, "ref", MAX_REF_LENGTH, true),
                requireText(branch, "branch", MAX_BRANCH_LENGTH, false),
                requireText(machine, "machine", MAX_MACHINE_LENGTH, false), startedAt, finishedAt,
                budget == null ? Budget.NONE : Budget.of(budget.slots(), budget.jobs(), budget.workers()),
                suites(suites), actor, now);
    }

    public int failed() {
        return (int) suites.stream().filter(suite -> !suite.ok()).count();
    }

    public double totalSeconds() {
        return suites.stream().mapToDouble(SuiteResult::seconds).sum();
    }

    /** What the run spends of the owner's allowance, in the measure {@link StorageUsage} uses. */
    public long bytes() {
        long total = StorageUsage.bytesOf(ref, branch, machine);
        for (SuiteResult suite : suites) {
            total += StorageUsage.bytesOf(suite.name());
        }
        return total;
    }

    private static String requireText(String value, String field, int max, boolean required) {
        String stripped = value == null ? "" : value.strip();
        if (stripped.isEmpty() && required) {
            throw OfficiumException.badRequest(field + "_required", "A run needs its " + field
                    + (field.equals("ref") ? ", like the commit's sha" : ""));
        }
        if (stripped.length() > max) {
            throw OfficiumException.badRequest(field + "_too_long",
                    "A run's " + field + " has at most " + max + " characters");
        }
        return stripped;
    }

    private static List<SuiteResult> suites(List<SuiteResult> suites) {
        if (suites == null || suites.isEmpty()) {
            throw OfficiumException.badRequest("suites_required", "A run reports at least one suite");
        }
        if (suites.size() > MAX_SUITES) {
            throw OfficiumException.badRequest("too_many_suites", "A run reports at most " + MAX_SUITES + " suites");
        }
        Set<String> seen = new HashSet<>();
        List<SuiteResult> result = new ArrayList<>(suites.size());
        for (SuiteResult suite : suites) {
            String name = suite == null || suite.name() == null ? "" : suite.name().strip();
            if (name.isEmpty() || name.length() > MAX_SUITE_NAME_LENGTH) {
                throw OfficiumException.badRequest("invalid_suite_name",
                        "Each suite has a name of 1 to " + MAX_SUITE_NAME_LENGTH + " characters");
            }
            if (!seen.add(name)) {
                throw OfficiumException.badRequest("duplicate_suite", "The run reports suite \"" + name + "\" twice");
            }
            if (!(suite.seconds() >= 0 && suite.seconds() <= MAX_SECONDS)) {
                throw OfficiumException.badRequest("invalid_seconds",
                        "Suite \"" + name + "\" took between 0 and " + (long) MAX_SECONDS + " seconds");
            }
            result.add(new SuiteResult(name, suite.ok(), suite.seconds()));
        }
        return result;
    }
}
