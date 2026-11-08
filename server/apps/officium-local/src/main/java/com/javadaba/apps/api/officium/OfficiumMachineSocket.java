package com.javadaba.apps.api.officium;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.javadaba.contexts.officium.application.ProjectMachineService;
import io.quarkus.websockets.next.CloseReason;
import io.quarkus.websockets.next.OnBinaryMessage;
import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.OnTextMessage;
import io.quarkus.websockets.next.OpenConnections;
import io.quarkus.websockets.next.UserData;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;
import io.vertx.core.buffer.Buffer;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * {@code WS /officium/v1/machines/connect?token=} -- a project's machine, the {@code officium-files}
 * process an agent started after {@code files.connect} (JDB-242). The token is single use and binds
 * the connection to one project; a second machine for the same project replaces the first.
 *
 * <p>Lives in {@code app-api} next to its twin {@link OfficiumFilesSocket}, which needs the session
 * codec -- same placement reason as {@code FluxorRelaySocket}. Per-connection state goes in
 * {@link WebSocketConnection#userData()}, never in fields: endpoint instances are shared.
 */
@WebSocket(path = "/officium/v1/machines/connect")
public class OfficiumMachineSocket {

    static final int UNAUTHORIZED = 4401;
    static final int REPLACED = 4409;
    private static final Pattern TOKEN = Pattern.compile("(?:^|&)token=([A-Za-z0-9]+)");
    private static final UserData.TypedKey<String> PROJECT = UserData.TypedKey.forString("officium.machine.project");

    private final WebSocketConnection connection;
    private final OpenConnections open;
    private final ProjectMachineService machines;
    private final OfficiumFileSwitchboard switchboard;
    private final ObjectMapper mapper;

    public OfficiumMachineSocket(WebSocketConnection connection, OpenConnections open, ProjectMachineService machines,
            OfficiumFileSwitchboard switchboard, ObjectMapper mapper) {
        this.connection = connection;
        this.open = open;
        this.machines = machines;
        this.switchboard = switchboard;
        this.mapper = mapper;
    }

    @OnOpen
    public void onOpen() {
        String query = connection.handshakeRequest().query();
        Matcher matcher = TOKEN.matcher(query == null ? "" : query);
        var grant = machines.redeem(matcher.find() ? matcher.group(1) : null);
        if (grant.isEmpty()) {
            connection.closeAndAwait(new CloseReason(UNAUTHORIZED, "invalid or expired token"));
            return;
        }
        connection.userData().put(PROJECT, grant.get().projectId().toString());
        machines.online(grant.get(), connection.id()).flatMap(open::findByConnectionId)
                .ifPresent(
                        previous -> previous.closeAndAwait(new CloseReason(REPLACED, "replaced by a newer machine")));
        switchboard.send(connection.id(), switchboard.message("ready", null)
                .put("projectId", grant.get().projectId().toString())
                .put("reconnectToken", machines.reconnectToken(grant.get())));
    }

    @OnTextMessage
    public void onText(String text) {
        if (connection.userData().get(PROJECT) == null) {
            return;
        }
        try {
            JsonNode frame = mapper.readTree(text);
            switchboard.fromMachine(connection.id(), frame);
        } catch (Exception malformed) {
            // A frame that isn't JSON belongs to no transfer; nothing to answer.
        }
    }

    @OnBinaryMessage
    public void onBinary(Buffer data) {
        if (connection.userData().get(PROJECT) != null) {
            switchboard.relayFromMachine(connection.id(), data.getBytes());
        }
    }

    @OnClose
    public void onClose() {
        String project = connection.userData().get(PROJECT);
        if (project != null) {
            machines.offline(UUID.fromString(project), connection.id());
            switchboard.connectionClosed(connection.id());
        }
    }
}
