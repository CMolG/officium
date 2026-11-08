package com.javadaba.apps.local;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.NicknameService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.JqlInvalid;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.VersionConflict;
import com.javadaba.platform.mcp.McpJsonRpcServer;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpOperationRegistry;
import com.javadaba.platform.mcp.McpOperationView;
import com.javadaba.platform.mcp.McpToolException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

/**
 * {@code /officium/mcp}: the same two MCP tools as Officium Cloud ({@code discover} and
 * {@code query}) over the shared stateless JSON-RPC transport, answered as the one local owner.
 * Authentication is {@code LocalGateFilter}'s. Operations of Cloud-only features are left out of
 * {@code discover} and answer {@code feature_unavailable_in_local} when called anyway.
 */
@Path("/officium/mcp")
public class LocalMcpResource {

    private static final String INSTRUCTIONS = "Officium Local: a self-hosted task tracker for agent-driven work. "
            + "Call discover to list the operations, then query {operation, params} to run one. Start with "
            + "projects.list, meta.states and cards.next. Features of Officium Cloud (organizations, billing, "
            + "GitHub, changelog, test history, cost telemetry, realtime presence) answer "
            + "feature_unavailable_in_local.";

    private final McpOperationRegistry<OfficiumCaller> operations;
    private final CloudOnlyOperations cloudOnly = new CloudOnlyOperations();
    private final ObjectMapper mapper;
    private final NicknameService nicknames;
    private final AccountSessionCodec owner;
    private final McpJsonRpcServer server;

    public LocalMcpResource(OfficiumMcpRegistry registry, ObjectMapper mapper, NicknameService nicknames,
            AccountSessionCodec owner) {
        this.operations = new McpOperationRegistry<>(registry.registry().discover(null).stream()
                .filter(op -> !cloudOnly.contains(op.key())).toList());
        this.mapper = mapper;
        this.nicknames = nicknames;
        this.owner = owner;
        this.server = new McpJsonRpcServer("officium-local", "Officium Local", mapper, INSTRUCTIONS);
    }

    @GET
    public Response getNotAllowed() {
        return Response.status(405).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response handle(@HeaderParam("X-Officium-Client") String client, JsonNode body) {
        McpJsonRpcServer.Reply reply = server.handle(body, new Backend(client));
        return Response.status(reply.status()).entity(reply.body()).build();
    }

    private OfficiumCaller callerFor(String client, JsonNode params) {
        UUID projectId = null;
        String machine = null;
        if (params != null) {
            JsonNode project = params.path("projectId");
            if (project.isTextual()) {
                try {
                    projectId = UUID.fromString(project.asText());
                } catch (IllegalArgumentException ignored) {
                    // A malformed id is the operation's to reject with its own error.
                }
            }
            machine = params.path("machine").isTextual() ? params.path("machine").asText() : null;
        }
        UUID accountId = owner.ownerId();
        String clientName = client == null || client.isBlank() ? "Agent" : client.strip();
        Actor actor = nicknames.agentActor(accountId, clientName, projectId, machine);
        return new OfficiumCaller(accountId, actor);
    }

    private final class Backend implements McpJsonRpcServer.Backend {

        private final String client;

        Backend(String client) {
            this.client = client;
        }

        @Override
        public List<McpOperationView> discover(String filter) {
            return operations.discover(filter).stream().map(McpOperation::view).toList();
        }

        @Override
        public Object query(String operation, JsonNode params) {
            if (cloudOnly.contains(operation)) {
                throw new McpToolException("feature_unavailable_in_local", "'" + operation
                        + "' is part of Officium Cloud and is not available in Officium Local.");
            }
            operations.find(operation).orElseThrow(() -> new McpToolException("unknown_operation",
                    "No such operation: " + operation, "/operation", null));
            try {
                return operations.query(callerFor(client, params), operation, params);
            } catch (OfficiumException ex) {
                Object current = ex instanceof VersionConflict vc ? vc.current() : null;
                Integer at = ex instanceof JqlInvalid invalid ? invalid.at() : null;
                throw new McpToolException(ex.code(), ex.getMessage() == null ? ex.code() : ex.getMessage(), null,
                        current == null ? null : mapper.valueToTree(current), at);
            }
        }
    }
}
