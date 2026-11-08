package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.AgentWorkService;
import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.application.SprintService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** {@code cards.setSprint}, in its own class because {@link OfficiumMcpRegistry} is at its size allowance. */
final class McpCardPlanning {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String EX_CARD = "22222222-2222-2222-2222-222222222222";

    private McpCardPlanning() {
    }

    static McpOperation<OfficiumCaller> operation(CardService cards, AgentWorkService agentWork) {
        return new McpOperation<>("cards.setSprint",
                "Plans a card into a sprint (`sprintId`) or back into the backlog (`sprintId` \"backlog\" or left "
                        + "out), at `position` there (0-based; omitted = the end). Not a closed sprint "
                        + "(`sprint_closed`), and never an epic: plan its children (`epic_not_plannable`). "
                        + "`expectedVersion` works as on cards.update.",
                McpOperation.WRITE, "officium:write",
                McpSchemas.schema(
                        Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer(), "sprintId", McpSchemas.string(), "position",
                                McpSchemas.integer()),
                        List.of("projectId", "cardId", "expectedVersion")),
                Map.of("projectId", EX_PROJECT, "cardId", EX_CARD, "expectedVersion", 1, "sprintId", EX_PROJECT),
                (caller, params) -> OfficiumMcpRegistry.following(agentWork, params, caller.actor(),
                        AgentWorkService.Signal.CONTINUES,
                        cards.setSprint(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpCardRef.id(cards, caller, params),
                                McpParams.integer(params, "expectedVersion", 0), sprintTarget(params),
                                McpParams.integer(params, "position", Integer.MAX_VALUE), caller.actor())));
    }

    /** {@code sprintId} absent, null or {@code "backlog"}: the backlog. */
    private static UUID sprintTarget(JsonNode params) {
        String raw = McpParams.string(params, "sprintId", null);
        return raw == null || SprintService.TO_BACKLOG.equals(raw) ? null : McpParams.uuid(params, "sprintId");
    }
}
