package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.HeartbeatService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;

/**
 * JAVA-675 (contract §4.2): a heartbeat token for the machine the agent runs on, without the token
 * passing through it. The answer carries a one-time code inside a command, nothing else. Its own
 * class because {@link OfficiumMcpRegistry} is at its size allowance.
 */
final class McpHeartbeat {

    private McpHeartbeat() {
    }

    static List<McpOperation<OfficiumCaller>> operations(HeartbeatService heartbeat) {
        return List.of(new McpOperation<>("heartbeat.setup",
                "Sets up the heartbeat on THIS machine: the token the harness's hooks use to keep your card live "
                        + "and report its time. Returns `command` (POSIX sh + curl): run it once, from any directory, "
                        + "and show the user only the line it prints. It keeps a token that still works, or trades "
                        + "a one-time code (valid 10 minutes, `expiresAt`) for a new token of this machine and saves "
                        + "it to ~/.config/officium/heartbeat-token, mode 0600. The token never appears in the "
                        + "conversation; the user can revoke this machine alone under Connect an agent.",
                McpOperation.WRITE, "officium:write",
                McpSchemas.schema(Map.of(), List.of()),
                Map.of(),
                (caller, params) -> heartbeat.setup(caller.accountId())));
    }
}
