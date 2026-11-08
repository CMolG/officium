package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.javadaba.contexts.officium.application.RoleMatrixService;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpToolException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * {@code projects.setRoleMatrix}'s {@code overrides}: {@code {categories: {row: {phase: [roles]}}, signals:
 * {...}, runs?: {row: {phase: {model, effort, roles?}}}, mods?: {row-or-signal: {phase: [modId]}}}}, validated by {@link RoleMatrix#fromWire}.
 */
final class RoleMatrixJson {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private RoleMatrixJson() {
    }

    static RoleMatrix overrides(JsonNode overrides) {
        if (!overrides.isObject()) {
            throw McpToolException.invalid("overrides must be an object", "/overrides");
        }
        Map<String, Map<String, Object>> runs = runsNamed(overrides)
                ? MAPPER.convertValue(overrides.get("runs"), new TypeReference<>() {
                })
                : null;
        return RoleMatrix.fromWire(rows(overrides.path("categories")), rows(overrides.path("signals")), runs,
                modsNamed(overrides) ? rows(overrides.path("mods")) : null);
    }

    /** Whether the write names the mods at all: one that does not keeps the project's (JAVA-1569). */
    static boolean modsNamed(JsonNode overrides) {
        return overrides.hasNonNull("mods");
    }

    /** {@code projects.setRoleMatrix}: a write naming no runs or no mods keeps the project's. */
    static RoleMatrixService.RoleMatrixView set(RoleMatrixService service, OfficiumMcpRegistry.OfficiumCaller caller,
            JsonNode params) {
        JsonNode body = params.path("overrides");
        return service.set(caller.accountId(), McpParams.uuid(params, "projectId"), overrides(body), runsNamed(body),
                modsNamed(body), McpParams.integer(params, "expectedVersion", 0), caller.actor());
    }

    /** Whether the write names the run cells at all: one that does not keeps the project's (JAVA-915). */
    static boolean runsNamed(JsonNode overrides) {
        return overrides.hasNonNull("runs");
    }

    private static Map<String, Map<String, List<String>>> rows(JsonNode node) {
        Map<String, Map<String, List<String>>> rows = new LinkedHashMap<>();
        node.fields().forEachRemaining(row -> {
            Map<String, List<String>> cells = new LinkedHashMap<>();
            row.getValue().fields().forEachRemaining(cell -> cells.put(cell.getKey(),
                    McpParams.stringArray(row.getValue(), cell.getKey())));
            rows.put(row.getKey(), cells);
        });
        return rows;
    }
}
