package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.AutoloopService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** The autoloop's remote switch (card://JAVA-1528), out of {@link OfficiumMcpRegistry} at its allowance. */
final class McpAutoloop {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final Map<String, Object> PROJECT = Map.of("projectId", EX_PROJECT);

    private McpAutoloop() {
    }

    static List<McpOperation<OfficiumCaller>> operations(AutoloopService autoloops) {
        List<McpOperation<OfficiumCaller>> list = new ArrayList<>(McpIntegrationGate.operations(autoloops));
        list.addAll(List.of(
                new McpOperation<>("autoloop.heartbeat",
                        "An autoloop supervisor's beat, every poll: `state` is `running` (its slots work cards) or "
                                + "`idle` (it waits in standby for an order), with its `machine`, `slots` and control "
                                + "branch (`target`). Answers `command`: `start`, `stop` or null, the order the board "
                                + "queued for it; when the project's integration gate is open it answers `stop` with a "
                                + "`reason` and the `gate` (and holds back a pending `start`). Without a beat for 90 s a loop shows offline. The supervisor's own "
                                + "beat goes over REST with the machine's heartbeat token (the backlog skill's "
                                + "officium-autoloop.mjs); this is the same beat for an agent.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "machine", McpSchemas.string(),
                                "state", McpSchemas.stringEnum("running", "idle"), "slots", McpSchemas.integer(),
                                "target", McpSchemas.string()), List.of("projectId", "machine", "state")),
                        Map.of("projectId", EX_PROJECT, "machine", "laptop-loop-1", "state", "idle", "slots", 2),
                        (caller, params) -> autoloops.heartbeat(caller.accountId(),
                                McpParams.uuid(params, "projectId"), McpParams.requiredString(params, "machine"),
                                McpParams.requiredString(params, "state"), McpParams.integer(params, "slots", null),
                                McpParams.string(params, "target", null), caller.actor())),
                new McpOperation<>("autoloop.status",
                        "Your autoloops on a project: `state` is `offline`, `idle` (waiting in standby) or "
                                + "`running`, the most active of them, `pending` the order queued for them, and "
                                + "`loops` each with its machine, state, slots and last beat.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")), PROJECT,
                        (caller, params) -> autoloops.status(caller.accountId(), McpParams.uuid(params, "projectId"))),
                new McpOperation<>("autoloop.start",
                        "Starts your autoloops waiting in standby on the project: their next beat takes `start`, "
                                + "and their slots begin asking cards.next. `no_idle_autoloop` when none waits.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")), PROJECT,
                        (caller, params) -> autoloops.start(caller.accountId(), McpParams.uuid(params, "projectId"),
                                caller.actor())),
                new McpOperation<>("autoloop.stop",
                        "Stops your running autoloops on the project: their next beat takes `stop`, they stop their "
                                + "sessions as /autoloop stop does (worktrees, claims and conversations kept) and wait "
                                + "in standby. `no_running_autoloop` when none runs.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")), PROJECT,
                        (caller, params) -> autoloops.stop(caller.accountId(), McpParams.uuid(params, "projectId"),
                                caller.actor()))));
        return list;
    }
}
