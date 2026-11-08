package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.application.MetaService;
import com.javadaba.contexts.officium.application.RoleMatrixService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpParams;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/** What {@code meta.states} answers, out of {@link OfficiumMcpRegistry}, which is at its size allowance. */
final class McpMetaStates {

    private McpMetaStates() {
    }

    static Map<String, Object> result(CardService cards, RoleMatrixService roleMatrices, OfficiumCaller caller,
            JsonNode params) {
        MetaService.Meta meta = MetaService.global(cards.rejectionEnabled());
        UUID projectId = McpParams.optionalUuid(params, "projectId");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("statuses", meta.statuses());
        result.put("priorities", meta.priorities());
        result.put("runStates", meta.runStates());
        result.put("executors", meta.executors());
        result.put("roles", meta.roles());
        result.put("categories", meta.categories());
        result.put("categoryGuide", meta.categoryGuide());
        result.put("classifierPrecedence", meta.classifierPrecedence());
        result.put("signals", meta.signals());
        result.put("phases", meta.phases());
        result.put("roleMatrix", meta.roleMatrix());
        result.put("rejectionReasons", meta.rejectionReasons());
        result.put("rejectionEnabled", meta.rejectionEnabled());
        result.put("reviewReturnReasons", meta.reviewReturnReasons());
        result.put("qualityDimensions", meta.qualityDimensions());
        result.put("qualityRules", meta.qualityRules());
        result.put("escapedPhases", meta.escapedPhases());
        result.put("lineageLines", meta.lineageLines());
        result.put("workflowSchema", meta.workflowSchema());
        result.put("precedence", meta.precedence());
        if (projectId != null) {
            result.put("roleMatrix", roleMatrices.get(caller.accountId(), projectId).effective());
            var facets = cards.facets(caller.accountId(), projectId);
            result.put("epics", facets.epics());
            result.put("tags", facets.tags());
            result.put("assignees", facets.assignees());
        }
        return result;
    }
}
