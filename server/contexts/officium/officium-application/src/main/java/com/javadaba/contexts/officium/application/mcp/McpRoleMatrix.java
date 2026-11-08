package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.RoleMatrixService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * {@code projects.roleMatrix} and {@code projects.setRoleMatrix}, out of {@link OfficiumMcpRegistry} at its size
 * allowance (JAVA-294, JAVA-915, JAVA-1569), with the execution mode's two ({@link McpExecutionMode}).
 */
final class McpRoleMatrix {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String READ = McpOperation.READ;
    private static final String WRITE = McpOperation.WRITE;
    private static final String SCOPE_READ = "officium:read";
    private static final String SCOPE_WRITE = "officium:write";

    private McpRoleMatrix() {
    }

    static List<McpOperation<OfficiumCaller>> operations(RoleMatrixService roleMatrices) {
        List<McpOperation<OfficiumCaller>> list = new ArrayList<>();
        list.add(new McpOperation<>("projects.roleMatrix",
                "Which Fluxor roles work this project's cards: `effective` is the default matrix with the "
                        + "project's `overrides` on top, `version` is what projects.setRoleMatrix expects (0: "
                        + "never changed). Same shape as meta.states' `roleMatrix`. " + RoleMatrixPlanText.VIEW,
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> roleMatrices.get(caller.accountId(), McpParams.uuid(params, "projectId"))));

        list.add(new McpOperation<>("projects.setRoleMatrix",
                "(Owner only) Replaces the project's override of the role matrix. `overrides` is "
                        + "{categories: {<category or \"spike/ux-ui\">: {<phase>: [role ids]}}, signals: "
                        + "{<signal>: {<phase>: [role ids]}}}: each cell it names replaces the default one, [] "
                        + "empties it, and {} goes back to the defaults. Role ids are Fluxor's kebab-case atom "
                        + "ids. `runs` (optional) is {<row>: {<phase>: {model, effort, roles?: {<role>: {model, "
                        + "effort}}}}}: the model and effort a cell is worked with; omit it to keep the project's. "
                        + "`mods` (optional) is {<row or signal>: {<phase>: [mod ids]}}, 20 a cell; "
                        + "omit it to keep the project's. " + RoleMatrixPlanText.WRITE
                        + "`expectedVersion` is the one projects.roleMatrix returned.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "expectedVersion", McpSchemas.integer(),
                        "overrides", McpSchemas.object()), List.of("projectId", "expectedVersion", "overrides")),
                Map.of("projectId", EX_PROJECT, "expectedVersion", 0, "overrides",
                        Map.of("categories", Map.of("bug", Map.of("review", List.of("code-reviewer"))))),
                (caller, params) -> RoleMatrixJson.set(roleMatrices, caller, params)));
        // The execution mode decides who works the action cells (card://JAVA-1878): it travels with the matrix.
        list.addAll(McpExecutionMode.operations(() -> roleMatrices.executionModes()));
        return list;
    }
}
