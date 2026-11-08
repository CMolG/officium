package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.SuiteTrend;
import com.javadaba.contexts.officium.domain.TestRun;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** A project's test-run history (JAVA-766), keyed by {@code (projectId, machine, startedAt)}. */
public interface TestRunRepository {

    /** {@code false} when the project already has that run (a retry, or a race). */
    boolean insert(TestRun run);

    Optional<TestRun> find(UUID projectId, String machine, Instant startedAt);

    /** Newest run first, each with its suites. */
    List<TestRun> list(UUID projectId, int limit);

    /** Per suite name, its last {@code points} runs, newest first; only suites in the project's last
     *  {@code points} runs, so a suite that was removed stops being listed. */
    Map<String, List<SuiteTrend.Point>> series(UUID projectId, int points);
}
