package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.ProjectService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;

/** The end of a project's life (JAVA-1554), out of {@link OfficiumMcpRegistry} at its allowance. */
final class McpProjectLifecycle {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpProjectLifecycle() {
    }

    static McpOperation<OfficiumCaller> delete(ProjectService projects) {
        return new McpOperation<>("projects.delete",
                "(Owner only) Deletes a project and everything in it for everyone: its cards, documentation, "
                        + "members, sprints and history. Not undoable. `confirm` must be the project's exact name, "
                        + "or `confirmation_mismatch`; anyone else on the project gets `owner_only`. A protected project "
                        + "(its `protected` flag, set by a migration alone) answers `project_protected` and stays.",
                McpOperation.WRITE, "officium:write",
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "confirm", McpSchemas.string()),
                        List.of("projectId", "confirm")),
                Map.of("projectId", EX_PROJECT, "confirm", "Name of the project"),
                (caller, params) -> {
                    projects.delete(caller.accountId(), McpParams.uuid(params, "projectId"),
                            McpParams.string(params, "confirm", null));
                    return Map.of("deleted", true);
                });
    }
}
