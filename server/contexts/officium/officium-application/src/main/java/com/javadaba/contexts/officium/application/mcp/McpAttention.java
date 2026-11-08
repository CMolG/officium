package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.AgentAttention;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;

/**
 * Getting your person's attention (JAVA-1144 presence, JAVA-1145 summons), in its own class because
 * {@link OfficiumMcpRegistry} is at its size allowance. Handlers read the services lazily, so the
 * registry test can build the table with none.
 */
final class McpAttention {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpAttention() {
    }

    static List<McpOperation<OfficiumCaller>> operations(AgentAttention attention) {
        return List.of(
                new McpOperation<>("presence.get",
                        "Whether your person has Officium open right now, on any of their devices. Returns `open` (a "
                                + "device beat under 150 s ago and has not closed), `visible` and `focused` (an open "
                                + "device is on screen / holds focus), `lastSeenAt`, and `devices[]` with each one's "
                                + "coarse label and state. Read it before summoning them: a person looking at Officium "
                                + "sees the summons at once, and one who is not needs another channel.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(Map.of(), List.of()),
                        Map.of(),
                        (caller, params) -> attention.presence().read(caller.accountId())),
                new McpOperation<>("summons.send",
                        "Ask your person, with a blocking modal in Officium, to answer what agents wait on: every "
                                + "open request, and every form of a human card that blocks an AI card of the "
                                + "active sprint. Call it as often as you like (every minute): the server starts a "
                                + "new round only for a first summons, a new item, a snooze that ended, or 15 "
                                + "minutes unanswered with Officium visible on no device; otherwise it answers "
                                + "`unchanged`. Keep calling while you wait: a summons no agent has sent for 5 "
                                + "minutes stops showing. `state`: `delivered` (a device had Officium open), `open` (none "
                                + "did: give the person `openPath`, to open in a browser), `unchanged`, `closed` "
                                + "(nothing is pending any more) or `none`.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "machine", McpSchemas.string()),
                                List.of("projectId", "machine")),
                        Map.of("projectId", EX_PROJECT, "machine", "my-laptop"),
                        (caller, params) -> attention.summons().send(caller.accountId(),
                                McpParams.uuid(params, "projectId"), McpParams.requiredString(params, "machine"),
                                caller.actor())),
                new McpOperation<>("summons.get",
                        "The state of your person's open summons for a project: `items` still pending, the "
                                + "`round`, whether it was `delivered` to an open device, `shownAt`, `seenAt` and "
                                + "`snoozedUntil`. Empty when no summons is open.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                        Map.of("projectId", EX_PROJECT),
                        (caller, params) -> attention.summons()
                                .get(caller.accountId(), McpParams.uuid(params, "projectId")).orElse(null)));
    }
}
