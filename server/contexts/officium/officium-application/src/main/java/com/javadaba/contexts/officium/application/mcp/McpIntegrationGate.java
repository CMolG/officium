package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.AutoloopService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.IntegrationGate;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;
import com.javadaba.platform.mcp.McpToolException;

import java.util.List;
import java.util.Map;

/**
 * The integration gate rules (JAVA-1820): {@code projects.integrationGate} and {@code projects.setIntegrationGate}.
 * They reach the gate through the autoloop it stops, so the registry's table does not grow.
 */
final class McpIntegrationGate {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final Map<String, Object> EX_RULES = Map.of("heldByDeploy",
            Map.of("enabled", true, "minPriority", "high"), "deployQueue", Map.of("enabled", true, "max", 5),
            "nothingElse", Map.of("enabled", true));

    private McpIntegrationGate() {
    }

    static List<McpOperation<OfficiumCaller>> operations(AutoloopService autoloops) {
        return List.of(
                new McpOperation<>("projects.integrationGate",
                        "The project's integration gate rules, which stop the autoloop when work waits on a branch "
                                + "nobody merged: `heldByDeploy` {enabled, minPriority} (a card waiting on a card in "
                                + "Deploy is held, and cards.next does not hand it out; the gate opens when a held "
                                + "card is at least `minPriority`), `deployQueue` {enabled, max} (opens when `max` "
                                + "cards or more wait in Deploy) and `nothingElse` {enabled} (opens when cards.next "
                                + "answers nothing and a card waits in Deploy). Every rule is off until set. "
                                + "`version` is what projects.setIntegrationGate expects (0: never set). Any member "
                                + "reads it; autoloop.status shows the gate itself.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                        Map.of("projectId", EX_PROJECT),
                        (caller, params) -> autoloops.gate().settings().get(caller.accountId(),
                                McpParams.uuid(params, "projectId"))),
                new McpOperation<>("projects.setIntegrationGate",
                        "(Owner only) Replaces the project's integration gate rules: `rules` is {heldByDeploy: "
                                + "{enabled, minPriority: superHigh|high|medium|low|superLow}, deployQueue: {enabled, "
                                + "max: 1 to 500}, nothingElse: {enabled}}; a rule left out is off. "
                                + "`expectedVersion` is the one projects.integrationGate returned.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer(), "rules", McpSchemas.object()),
                                List.of("projectId", "expectedVersion", "rules")),
                        Map.of("projectId", EX_PROJECT, "expectedVersion", 0, "rules", EX_RULES),
                        (caller, params) -> autoloops.gate().settings().set(caller.accountId(),
                                McpParams.uuid(params, "projectId"), input(params.path("rules")),
                                McpParams.integer(params, "expectedVersion", 0), caller.actor())));
    }

    private static IntegrationGate.Input input(JsonNode rules) {
        if (!rules.isObject()) {
            throw McpToolException.invalid("rules must be an object", "/rules");
        }
        JsonNode held = rules.path("heldByDeploy");
        JsonNode queue = rules.path("deployQueue");
        return new IntegrationGate.Input(flag(held), held.hasNonNull("minPriority")
                ? held.get("minPriority").asText()
                : null, flag(queue), queue.hasNonNull("max") ? number(queue.get("max")) : null,
                flag(rules.path("nothingElse")));
    }

    private static Boolean flag(JsonNode rule) {
        return rule.hasNonNull("enabled") ? rule.get("enabled").asBoolean() : null;
    }

    private static Integer number(JsonNode node) {
        if (!node.isInt()) {
            throw McpToolException.invalid("max must be a whole number", "/rules/deployQueue/max");
        }
        return node.asInt();
    }
}
