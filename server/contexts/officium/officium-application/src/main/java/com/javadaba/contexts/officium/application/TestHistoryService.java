package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.ChangelogToken;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.SuiteTrend;
import com.javadaba.contexts.officium.domain.TestRun;
import com.javadaba.contexts.officium.domain.ports.ChangelogRepository;
import com.javadaba.contexts.officium.domain.ports.ProjectRepository;
import com.javadaba.contexts.officium.domain.ports.TestRunRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * A project's test-run history (JAVA-766, contract §8.12): every full run its runner posts, and per
 * suite the trend that says whether it is getting slower ({@link SuiteTrend}).
 *
 * <p>The runner posts with the machine's own agent token (JAVA-786), the one "Connect an agent" puts
 * on it, and the project it names; a CI posts with the project's pipeline token, the one that records
 * the changelog (§8.8). Each is created and revoked by the owner in the web, never passed through an
 * agent. Recording is idempotent on {@code (machine, startedAt)}, so a retried post never writes a run
 * twice.
 */
@ApplicationScoped
public class TestHistoryService {

    public static final int DEFAULT_RUNS = 20;
    public static final int MAX_RUNS = 200;
    public static final int DEFAULT_POINTS = 30;
    public static final int MAX_POINTS = 200;

    /** Who a token-recorded run is attributed to: the owner's account, as their test runner. */
    public static final String RUNNER = "Test runner";

    private final TestRunRepository runs;
    private final ChangelogRepository tokens;
    private final ProjectRepository projects;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final StorageQuotaService quota;
    private final Clock clock;

    @Inject
    public TestHistoryService(TestRunRepository runs, ChangelogRepository tokens, ProjectRepository projects,
            ProjectAccessGuard guard, ActivityPublisher activity, StorageQuotaService quota) {
        this(runs, tokens, projects, guard, activity, quota, Clock.systemUTC());
    }

    TestHistoryService(TestRunRepository runs, ChangelogRepository tokens, ProjectRepository projects,
            ProjectAccessGuard guard, ActivityPublisher activity, StorageQuotaService quota, Clock clock) {
        this.runs = runs;
        this.tokens = tokens;
        this.projects = projects;
        this.guard = guard;
        this.activity = activity;
        this.quota = quota;
        this.clock = clock;
    }

    /** The runner posting a run with the project's pipeline token. */
    public Recorded ingest(String token, RunReport report) {
        Project project = (token == null || !token.startsWith(ChangelogToken.PREFIX)
                ? Optional.<UUID>empty()
                : tokens.projectForTokenHash(ChangelogToken.hash(token)))
                .flatMap(projects::findById)
                .orElseThrow(() -> new OfficiumException("invalid_token",
                        "This token records nothing: it is unknown or was revoked. The project's owner creates "
                                + "a new one in the project's Documentation, under Changelog.",
                        401));
        return record(project, report, Actor.agent(project.ownerAccountId(), RUNNER));
    }

    /**
     * A machine of a project member recording a run with its agent token (the one "Connect an agent"
     * issues), so nothing has to be pasted: the member needs to be able to edit the project. A
     * non-member is refused with 403, not 404: the caller named the project, and the token is theirs.
     */
    public Recorded ingestAsMember(UUID accountId, UUID projectId, RunReport report) {
        if (projectId == null) {
            throw OfficiumException.badRequest("project_required",
                    "Say which project the run belongs to: projectId, from .harness/config/backlog.json");
        }
        if (!guard.hasAccess(projectId, accountId)) {
            throw OfficiumException.forbidden("not_a_member", "This account is not a member of that project");
        }
        Project project = guard.requireAtLeast(projectId, accountId, Role.EDITOR).project();
        return record(project, report, Actor.agent(accountId, RUNNER));
    }

    private Recorded record(Project project, RunReport report, Actor recorder) {
        Instant now = Instant.now(clock);
        TestRun run = TestRun.recorded(project.id(), report.ref(), report.branch(), report.machine(),
                report.startedAt(), report.finishedAt(),
                new TestRun.Budget(report.slots(), report.jobs(), report.workers()), report.suites() == null
                        ? null
                        : report.suites().stream()
                                .map(s -> s == null
                                        ? null
                                        : new TestRun.SuiteResult(s.name() == null ? "" : s.name(), s.ok(),
                                                s.seconds()))
                                .toList(),
                recorder, now);
        var existing = runs.find(project.id(), run.machine(), run.startedAt());
        if (existing.isPresent()) {
            return new Recorded(RunView.of(existing.get()), false);
        }
        quota.requireRoom(project, run.bytes());
        if (!runs.insert(run)) {
            // A concurrent retry recorded it first: the same run, so the same answer.
            return new Recorded(RunView.of(runs.find(project.id(), run.machine(), run.startedAt()).orElseThrow()),
                    false);
        }
        activity.record(project.id(), null, null, run.recordedBy(), "tests.recorded", "Test run recorded: "
                + run.suites().size() + " suites, " + run.failed() + " failed, " + Math.round(run.totalSeconds())
                + " s of suite time, at " + shortRef(run.ref()), now);
        activity.publish("tests.changed", project.id(), null, null, null, run.recordedBy(), now);
        return new Recorded(RunView.of(run), true);
    }

    /** The project's latest runs, newest first. */
    public List<RunView> runs(UUID accountId, UUID projectId, Integer limit) {
        guard.requireAccess(projectId, accountId);
        int size = limit == null || limit <= 0 ? DEFAULT_RUNS : Math.min(limit, MAX_RUNS);
        return runs.list(projectId, size).stream().map(RunView::of).toList();
    }

    /**
     * Each suite's trend over its last {@code points} runs, growing ones first; with {@code suite},
     * only that one. A suite nobody has run in the project's last {@code points} runs is not listed.
     */
    public List<SuiteTrend> suites(UUID accountId, UUID projectId, String suite, Integer points) {
        guard.requireAccess(projectId, accountId);
        int size = points == null || points <= 0 ? DEFAULT_POINTS : Math.min(points, MAX_POINTS);
        String only = suite == null || suite.isBlank() ? null : suite.strip();
        return runs.series(projectId, size).entrySet().stream()
                .filter(entry -> only == null || entry.getKey().equals(only))
                .map(entry -> SuiteTrend.of(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing((SuiteTrend trend) -> !trend.growing()).thenComparing(SuiteTrend::suite))
                .toList();
    }

    private static String shortRef(String ref) {
        return ref.length() <= 12 ? ref : ref.substring(0, 12);
    }

    /** A run as the runner reports it. {@code slots}, {@code jobs} and {@code workers} are its budget,
     *  each optional ({@link TestRun.Budget}). */
    public record RunReport(String ref, String branch, String machine, Instant startedAt, Instant finishedAt,
            Integer slots, Integer jobs, Integer workers, List<SuiteReport> suites) {
    }

    public record SuiteReport(String name, boolean ok, double seconds) {
    }

    /** Wire shape of a {@link TestRun}. */
    public record RunView(UUID id, String ref, String branch, String machine, Instant startedAt, Instant finishedAt,
            Integer slots, Integer jobs, Integer workers, int failed, double totalSeconds,
            List<TestRun.SuiteResult> suites, ActorJson recordedBy, Instant recordedAt) {

        static RunView of(TestRun run) {
            return new RunView(run.id(), run.ref(), run.branch(), run.machine(), run.startedAt(), run.finishedAt(),
                    run.budget().slots(), run.budget().jobs(), run.budget().workers(), run.failed(),
                    run.totalSeconds(), run.suites(), ActorJson.of(run.recordedBy()), run.recordedAt());
        }
    }

    /** {@code created} tells REST to answer 201 instead of 200. */
    public record Recorded(RunView run, boolean created) {
    }
}
