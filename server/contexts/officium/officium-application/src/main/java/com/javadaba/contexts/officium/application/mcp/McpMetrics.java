package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.MetricsService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

/** {@code metrics.get}, out of {@link OfficiumMcpRegistry}, which is at its size allowance (card://JAVA-1524). */
final class McpMetrics {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpMetrics() {
    }

    static List<McpOperation<OfficiumCaller>> operations(MetricsService metrics) {
        return List.of(new McpOperation<>("metrics.get",
                "A project's Contributions for a period (contract §8.3): cards delivered (first arrival at review "
                        + "or later), hours (imputed from agent runs vs typed), who delivered what, mean cycle time "
                        + "and logged hours per category, and the longest-open cards. Tokens come from sessions: "
                        + "`tokenCoverage` says how many deliveries and agent hours recorded them, and the per-card "
                        + "token figures average over those deliveries only. `tokens.cost` and each contributor's `usd` estimate "
                        + "what the usage would cost at API list prices (card://JAVA-1777); `unpricedModels` names what it could not price. Give `from`/`to` "
                        + "(yyyy-mm-dd, inclusive) or a `sprintId`; to compare two periods, call it twice.",
                McpOperation.READ, "officium:read",
                McpSchemas.schema(
                        Map.of("projectId", McpSchemas.string(), "from", McpSchemas.string(), "to", McpSchemas.string(),
                                "sprintId", McpSchemas.string()),
                        List.of("projectId")),
                Map.of("projectId", EX_PROJECT, "from", "2026-09-14", "to", "2026-09-20"),
                (caller, params) -> metrics.metrics(caller.accountId(), McpParams.uuid(params, "projectId"),
                        OfficiumMcpRegistry.date(params, "from"), OfficiumMcpRegistry.date(params, "to"),
                        McpParams.optionalUuid(params, "sprintId"))),
                new McpOperation<>("value.get",
                        "A project's value report for a month (card://JAVA-1047): the cards delivered, the agent hours and "
                                + "how many of them ran with nobody at the keyboard, the tokens at API prices, the cost per "
                                + "delivered card and the value per subscription dollar. `unpricedModels` names the models "
                                + "without a price, which are left out of the value. Give `month` (yyyy-mm); the month before "
                                + "it is beside it.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "month", McpSchemas.string()),
                                List.of("projectId", "month")),
                        Map.of("projectId", EX_PROJECT, "month", "2026-09"),
                        (caller, params) -> metrics.value(caller.accountId(), McpParams.uuid(params, "projectId"),
                                month(params))));
    }

    private static YearMonth month(JsonNode params) {
        try {
            return YearMonth.parse(McpParams.requiredString(params, "month"));
        } catch (DateTimeParseException ex) {
            throw OfficiumException.badRequest("invalid_month", "month must be yyyy-mm");
        }
    }
}
