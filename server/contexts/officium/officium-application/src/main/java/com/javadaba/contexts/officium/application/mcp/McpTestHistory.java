package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.TestHistoryService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;

/** The test-run history (JAVA-766), moved out of {@link OfficiumMcpRegistry} so the registry doesn't grow past its allowance (JAVA-792). */
final class McpTestHistory {

    private static final String READ = McpOperation.READ;
    private static final String SCOPE_READ = "officium:read";
    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpTestHistory() {
    }

    /** JAVA-766 (contract §8.12): the test-run history, read-only here. Runs are recorded by the
     *  project's runner with the pipeline token, which never passes through an agent. */
    static void addTestHistoryOperations(List<McpOperation<OfficiumCaller>> list,
            TestHistoryService testHistory) {
        list.add(new McpOperation<>("tests.runs",
                "The project's latest full test runs, newest first: commit, branch, machine, the budget it "
                        + "ran with (`slots`, `jobs`, `workers`; null when the runner did not say), and per suite "
                        + "whether it passed and its seconds. Recorded by the project's test runner "
                        + "(scripts/local-tests.mjs), never by hand.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "limit", McpSchemas.integer()),
                        List.of("projectId")),
                Map.of("projectId", EX_PROJECT, "limit", 5),
                (caller, params) -> testHistory.runs(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.integer(params, "limit", null))));

        list.add(new McpOperation<>("tests.suites",
                "Each suite's trend over its last `points` runs (default 30): its latest run, the median of "
                        + "the passing runs before it made the same way (`basis`: same machine, `slots`, `jobs` "
                        + "and `workers`; `compared` says how many), and `growing` when the latest passing run is "
                        + "over 125% of that median and at least 10 s above it, with 5 or more runs to compare. "
                        + "Fewer comparable runs give no verdict: raise `points` to look further back. Growing "
                        + "suites come first; pass `suite` for one. A growing suite is treated like a red: find "
                        + "what made it slower, or open a card that says why the time is justified.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "suite", McpSchemas.string(),
                        "points", McpSchemas.integer()), List.of("projectId")),
                Map.of("projectId", EX_PROJECT, "suite", "landing-e2e"),
                (caller, params) -> testHistory.suites(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.string(params, "suite", null), McpParams.integer(params, "points", null))));
    }
}
