package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.javadaba.contexts.officium.application.AgentWorkService;
import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.application.CardWorkflowService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.CardWorkflow;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;

/**
 * {@code cards.setWorkflow} (card://JAVA-1591): a card's own role and mods per phase, validated against the card; on an
 * epic, also the part that works its cards (card://JAVA-1885).
 */
final class McpCardWorkflow {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String EX_CARD = "22222222-2222-2222-2222-222222222222";
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private McpCardWorkflow() {
    }

    static McpOperation<OfficiumCaller> operation(CardWorkflowService workflows, AgentWorkService agentWork,
            CardService cards) {
        return new McpOperation<>("cards.setWorkflow",
                "Sets a card's own workflow: the role (and its extra mods) that works each phase it visits, instead of "
                        + "the project's role matrix. `workflow` is {version: 1, phases: {<phase>: {role, mods}}}, the "
                        + "phases refine, action, ready, review, deploy; each role must be eligible for the card in that "
                        + "phase (`workflow_invalid` names every problem). Omit `workflow` (or send null) to clear it. "
                        + "A phase left out keeps the matrix's role. `expectedVersion` works as on cards.update. An "
                        + "epic's workflow is written ONCE for the whole epic and works both execution modes: `phases` "
                        + "works the epic's own session (epic by epic), and `cards: {<category>: {<phase>: {role, "
                        + "mods}}}` (a ux-ui spike's row is `spike/ux-ui`) works each of its cards of that category "
                        + "(card by card), and gives a sweep's checkpoints their mods. A part's roles must be eligible "
                        + "for its category with no signals; leave a phase out to let the matrix and the card's signals "
                        + "answer it. A card inside an epic takes no workflow of its own (`epic_workflow`): its "
                        + "`workflow` is its epic's part, and `workflowFrom` names the epic.",
                McpOperation.WRITE, "officium:write",
                McpSchemas.schema(
                        Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer(), "workflow", CardWorkflow.schema()),
                        List.of("projectId", "cardId", "expectedVersion")),
                Map.of("projectId", EX_PROJECT, "cardId", EX_CARD, "expectedVersion", 1,
                        "workflow", Map.of("version", 1, "phases", Map.of("action",
                                Map.of("role", "backend-developer", "mods", List.of())))),
                (caller, params) -> OfficiumMcpRegistry.following(agentWork, params, caller.actor(),
                        AgentWorkService.Signal.CONTINUES,
                        workflows.set(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpCardRef.id(cards, caller, params), McpParams.integer(params, "expectedVersion", 0),
                                document(params), caller.actor())));
    }

    /** The document as a map, which {@link CardWorkflow#validate} reads; absent or null clears the workflow. */
    static Map<String, Object> document(JsonNode params) {
        return params.hasNonNull("workflow") ? MAPPER.convertValue(params.get("workflow"), MAP_TYPE) : null;
    }
}
