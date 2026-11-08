package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.SessionQueueService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;

/** The agent-window operations, in their own class because {@link OfficiumMcpRegistry} is at its size
 *  allowance (JAVA-800). */
final class McpSessionQueue {

    private static final String READ = McpOperation.READ;
    private static final String WRITE = McpOperation.WRITE;
    private static final String SCOPE_READ = "officium:read";
    private static final String SCOPE_WRITE = "officium:write";
    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String EX_CARD = "22222222-2222-2222-2222-222222222222";

    private McpSessionQueue() {
    }

    /** JAVA-561 (contract §4.3): the caller's own agent windows and the cards queued into them. The
     *  waiter's routes sign with the heartbeat token and have no MCP twin, like the heartbeat. */
    static void addOperations(List<McpOperation<OfficiumCaller>> list,
            SessionQueueService sessionQueue) {
        list.add(new McpOperation<>("sessions.list",
                "Your own open agent windows (Claude Code sessions whose Officium waiter is running), each with "
                        + "its state (blocked = waiting on you at a prompt, working, idle, offline), the card it "
                        + "was last handed, how many it has worked, the cards queued into it in order, and what "
                        + "its status line last reported (context used, model, effort, cost, the account's "
                        + "limits). Only yours: nobody else's windows are ever listed.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of(), List.of()),
                Map.of(),
                (caller, params) -> sessionQueue.list(caller.accountId())));

        list.add(new McpOperation<>("cards.queue",
                "Queues a card into one of YOUR agent windows (`sessionId` from sessions.list): an idle window "
                        + "starts it within seconds, a working one takes it after its current card. A card is in "
                        + "one queue at most, so queueing it again moves it to the end of that window's queue. An "
                        + "agent's card only: never a human card, an epic or a Completed one.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string(),
                        "sessionId", McpSchemas.string()), List.of("projectId", "cardId", "sessionId")),
                Map.of("projectId", EX_PROJECT, "cardId", EX_CARD, "sessionId", "5f0c6a52-0d0e-4f4e-9a0b-3c1d2e3f4a5b"),
                (caller, params) -> sessionQueue.queue(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "cardId"), McpParams.requiredString(params, "sessionId"),
                        caller.actor())));

        list.add(new McpOperation<>("cards.unqueue",
                "Takes a card out of the agent-window queue you put it in. A card nobody queued, or someone else "
                        + "queued, answers `not_queued`.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string()),
                        List.of("projectId", "cardId")),
                Map.of("projectId", EX_PROJECT, "cardId", EX_CARD),
                (caller, params) -> {
                    sessionQueue.unqueue(caller.accountId(), McpParams.uuid(params, "projectId"),
                            McpParams.requiredString(params, "cardId"), caller.actor());
                    return Map.of("unqueued", true);
                }));
    }
}
