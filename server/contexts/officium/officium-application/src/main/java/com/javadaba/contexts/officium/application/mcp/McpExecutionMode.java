package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.ExecutionModeSettings;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.ExecutionMode;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * {@code projects.executionMode} and {@code projects.setExecutionMode} (card://JAVA-1878, epic JAVA-1868). They reach
 * the setting through the role matrix it changes, so the registry's table does not grow.
 */
final class McpExecutionMode {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpExecutionMode() {
    }

    /** {@code settings} is read when a call runs, never when the table is built (the registry test builds it empty). */
    static List<McpOperation<OfficiumCaller>> operations(Supplier<ExecutionModeSettings> settings) {
        return List.of(
                new McpOperation<>("projects.executionMode",
                        "How the project's agents execute its cards: `mode` is `card` (each card handed out and worked "
                                + "on its own, the default) or `epic` (an open epic is the unit of the action and review "
                                + "phases: cards.next hands it out once, with a `sweep`, and ONE session of "
                                + "`implementerRole` works its cards in order as checkpoints, cards.setCheckpoint "
                                + "between them). `version` is what projects.setExecutionMode expects (0: never set). "
                                + "Any member reads it.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                        Map.of("projectId", EX_PROJECT),
                        (caller, params) -> settings.get().get(caller.accountId(),
                                McpParams.uuid(params, "projectId"))),
                new McpOperation<>("projects.setExecutionMode",
                        "(Owner only) Sets how the project's agents execute its cards: `mode` `card` or `epic`, and "
                                + "`implementerRole` (a Fluxor board role of the Action phase, `core-implementer` by "
                                + "default), which works every action cell but the spikes' in epic mode. No card is "
                                + "rewritten either way: switching back to `card` restores today's behavior. "
                                + "`dryRun: true` stores nothing and answers the `preview`: the open cards, how many "
                                + "belong to an epic unit and how many stand alone, each open epic with its checkpoints, "
                                + "and the card workflows whose action role the implementer would replace (their mods "
                                + "stay). `expectedVersion` is the one projects.executionMode returned.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer(), "mode", McpSchemas.stringEnum("card", "epic"), "implementerRole",
                                McpSchemas.string(), "dryRun", McpSchemas.bool()),
                                List.of("projectId", "expectedVersion", "mode")),
                        Map.of("projectId", EX_PROJECT, "expectedVersion", 0, "mode", "epic", "dryRun", true),
                        (caller, params) -> settings.get().set(caller.accountId(), McpParams.uuid(params, "projectId"),
                                ExecutionMode.of(McpParams.string(params, "mode", null),
                                        McpParams.string(params, "implementerRole", null)),
                                McpParams.integer(params, "expectedVersion", 0),
                                params.path("dryRun").asBoolean(false), caller.actor())));
    }
}
