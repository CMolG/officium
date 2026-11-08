package com.javadaba.contexts.officium.application.mcp;

import static com.javadaba.contexts.officium.application.mcp.McpEnums.categoryEnum;
import static com.javadaba.contexts.officium.application.mcp.McpEnums.executorEnum;
import static com.javadaba.contexts.officium.application.mcp.McpEnums.priorityEnum;
import static com.javadaba.contexts.officium.application.mcp.McpEnums.rejectionEnum;
import static com.javadaba.contexts.officium.application.mcp.McpEnums.signalEnum;
import static com.javadaba.contexts.officium.application.mcp.McpEnums.statusEnum;
import static com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.category;
import static com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.executor;
import static com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.priority;
import static com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.rejection;
import static com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.signal;
import static com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.sort;
import static com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.status;

import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** {@code cards.search}, in its own class because {@link OfficiumMcpRegistry} is at its size allowance. */
final class McpCardSearch {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpCardSearch() {
    }

    static McpOperation<OfficiumCaller> operation(CardService cards) {
        return new McpOperation<>("cards.search",
                "Full-text + filtered search over a project's cards, with cursor paging. Use `assignee: \"me\"` "
                        + "for your own cards, `executor: \"human\"` for cards a human card is not yours to run, "
                        + "and `humanEditPending: true` for the cards a PERSON changed since an agent last "
                        + "looked -- check those first: a card waiting on a person is often answered by editing "
                        + "it. Read one with cards.get, then cards.acknowledgeHumanEdit. `status: \"done\"` lists "
                        + "the completed cards and `status: \"rejected\"` the rejected ones, which the board keeps off "
                        + "its columns; `rejection` narrows those to one reason. `sprint` narrows to one "
                        + "sprint's cards: its id, \"active\" or \"backlog\" (the cards in no sprint). `signal` "
                        + "narrows to the cards carrying one (meta.states lists them). `role` narrows to the cards "
                        + "one role may take: its id as a card's `eligibleRoles` lists it (closed cards never match; "
                        + "ignored when `jql` is given). Pass `jql` "
                        + "instead of the flat filters above for OQL, the query language the search view speaks "
                        + "(\"status in (\\\"To do\\\", \\\"In progress\\\") AND priority >= High\") -- it can "
                        + "express OR/NOT/IN/date ranges the flat filters cannot; a bad query answers "
                        + "`jql_invalid` with the message and character offset (`at`).",
                McpOperation.READ, "officium:read",
                McpSchemas.schema(cardSearchProperties(), List.of("projectId")),
                Map.of("projectId", EX_PROJECT, "limit", 20),
                (caller, params) -> {
                    String jql = McpParams.string(params, "jql", null);
                    if (jql != null && !jql.isBlank()) {
                        return cards.searchByJql(caller.accountId(), McpParams.uuid(params, "projectId"), jql,
                                McpParams.string(params, "cursor", null), McpParams.integer(params, "limit", 50));
                    }
                    return cards.search(caller.accountId(), McpParams.uuid(params, "projectId"),
                            new CardService.SearchRequest(McpParams.string(params, "text", null), status(params),
                                    priority(params), McpParams.string(params, "epic", null),
                                    McpParams.string(params, "tag", null), McpParams.string(params, "assignee", null),
                                    executor(params), category(params), McpParams.bool(params, "blocked", null),
                                    McpParams.bool(params, "humanEditPending", null), sort(params),
                                    McpParams.string(params, "cursor", null),
                                    McpParams.integer(params, "limit", 50), McpParams.string(params, "sprint", null),
                                    signal(params), rejection(params), McpParams.string(params, "role", null)));
                });
    }

    private static Map<String, Object> cardSearchProperties() {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("projectId", McpSchemas.string());
        props.put("text", McpSchemas.string());
        props.put("status", statusEnum());
        props.put("priority", priorityEnum());
        props.put("epic", McpSchemas.string());
        props.put("tag", McpSchemas.string());
        props.put("assignee", McpSchemas.string());
        props.put("executor", executorEnum());
        props.put("category", categoryEnum());
        props.put("signal", signalEnum());
        props.put("rejection", rejectionEnum());
        props.put("role", McpSchemas.string());
        props.put("blocked", McpSchemas.bool());
        props.put("humanEditPending", McpSchemas.bool());
        props.put("sprint", McpSchemas.string());
        props.put("sort", McpSchemas.stringEnum("order", "priority", "updated", "created"));
        props.put("cursor", McpSchemas.string());
        props.put("limit", McpSchemas.integer());
        props.put("jql", McpSchemas.string());
        return props;
    }
}
