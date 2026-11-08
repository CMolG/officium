package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.CardRequestService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * JAVA-1122's operations: an agent asks its person for one quick action on the card it works, reads
 * the answer, and closes the request when it resumes. Their own class because
 * {@link OfficiumMcpRegistry} is at its size allowance.
 */
final class McpCardRequests {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String EX_CARD = "22222222-2222-2222-2222-222222222222";
    private static final String EX_REQUEST = "33333333-3333-3333-3333-333333333333";

    private McpCardRequests() {
    }

    static List<McpOperation<OfficiumCaller>> operations(CardRequestService requests) {
        Map<String, Object> ask = new LinkedHashMap<>();
        ask.put("projectId", McpSchemas.string());
        ask.put("cardId", McpSchemas.string());
        ask.put("action", McpSchemas.string());
        ask.put("detail", McpSchemas.string());
        ask.put("why", McpSchemas.string());
        ask.put("machine", McpSchemas.string());
        return List.of(
                new McpOperation<>("cards.requestAction",
                        "Asks your person for ONE quick action that only unblocks the card you are working, and "
                                + "waits on it without opening a card: \"Open a root tmux session on the server\", "
                                + "\"Leave the test key in that file\". `action` is one line (max 140); `detail` "
                                + "(Markdown, max 2000) carries the steps or the exact command; `why` says what you "
                                + "are blocked on. The card shows \"Waiting for you\" and the person answers done or "
                                + "declined, with an optional note. Wait for it in the background with the "
                                + "backlog skill's `scripts/officium-request-wait.sh <id> [--minutes N]`; when it ends, read the request "
                                + "(cards.requests), act on it and close it (cards.closeRequest). A decision, a legal "
                                + "or money call, an account to set up, or anything that outlives this run is a "
                                + "card instead: cards.requestHuman. One request per card at a time "
                                + "(`request_exists`); not on a human card or an epic.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(ask, List.of("projectId", "cardId", "action")),
                        Map.of("projectId", EX_PROJECT, "cardId", EX_CARD, "action",
                                "Open a root tmux session on the server", "detail",
                                "`tmux new -s jdb`, then `ssh root@<server>`", "why",
                                "The measurement reads Prometheus inside the server"),
                        (caller, params) -> requests.open(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "cardId"), new CardRequestService.NewRequest(
                                        McpParams.requiredString(params, "action"),
                                        McpParams.string(params, "detail", null),
                                        McpParams.string(params, "why", null)),
                                caller.actor())),
                new McpOperation<>("cards.requests",
                        "The project's requests that are not closed, oldest first: `open` ones wait on a person, "
                                + "`done` or `declined` ones wait on their agent to resume and close them. Each "
                                + "carries its card's key and title, the person's `note` and who answered.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                        Map.of("projectId", EX_PROJECT),
                        (caller, params) -> requests.live(caller.accountId(), McpParams.uuid(params, "projectId"))),
                new McpOperation<>("cards.closeRequest",
                        "Closes a request: once you resumed after its answer, or to withdraw it. Closing a closed "
                                + "one changes nothing. Until it is closed, cards.next hands its card out first.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "requestId", McpSchemas.string()),
                                List.of("projectId", "requestId")),
                        Map.of("projectId", EX_PROJECT, "requestId", EX_REQUEST),
                        (caller, params) -> requests.close(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.uuid(params, "requestId"), caller.actor())));
    }
}
