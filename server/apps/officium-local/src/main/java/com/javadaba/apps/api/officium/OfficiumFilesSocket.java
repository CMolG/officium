package com.javadaba.apps.api.officium;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.CardAttachmentService;
import com.javadaba.contexts.officium.application.ProjectMachineService;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import io.quarkus.websockets.next.CloseReason;
import io.quarkus.websockets.next.OnBinaryMessage;
import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.OnTextMessage;
import io.quarkus.websockets.next.UserData;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;
import io.vertx.core.buffer.Buffer;

import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * {@code WS /officium/v1/projects/{projectId}/files} -- the browser end of attachment transfers
 * (JDB-242), authenticated by the {@code jdb_session} cookie the upgrade request carries. Access is
 * the same as the project's REST: not a member = the socket closes with 4404 before any frame.
 *
 * <p>{@code upload{transferId, cardId, name, size, contentType}} and
 * {@code download{transferId, cardId, attachmentId}} are validated by {@link CardAttachmentService}
 * here; everything else about a transfer is {@link OfficiumFileSwitchboard}'s.
 */
@WebSocket(path = "/officium/v1/projects/{projectId}/files")
public class OfficiumFilesSocket {

    static final int NOT_FOUND = 4404;
    private static final Pattern TRANSFER_ID = Pattern.compile(
            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
    private static final UserData.TypedKey<String> ACCOUNT = UserData.TypedKey.forString("officium.files.account");
    private static final UserData.TypedKey<String> NAME = UserData.TypedKey.forString("officium.files.name");

    private final WebSocketConnection connection;
    private final AccountSessionCodec codec;
    private final CardAttachmentService attachments;
    private final ProjectMachineService machines;
    private final OfficiumFileSwitchboard switchboard;
    private final ObjectMapper mapper;

    public OfficiumFilesSocket(WebSocketConnection connection, AccountSessionCodec codec,
            CardAttachmentService attachments, ProjectMachineService machines, OfficiumFileSwitchboard switchboard,
            ObjectMapper mapper) {
        this.connection = connection;
        this.codec = codec;
        this.attachments = attachments;
        this.machines = machines;
        this.switchboard = switchboard;
        this.mapper = mapper;
    }

    @OnOpen
    public void onOpen() {
        Optional<AccountSession> session = sessionCookie().flatMap(codec::verify);
        if (session.isEmpty()) {
            connection.closeAndAwait(new CloseReason(OfficiumMachineSocket.UNAUTHORIZED, "unauthenticated"));
            return;
        }
        try {
            machines.machine(session.get().accountId(), projectId());
        } catch (OfficiumException | IllegalArgumentException notYours) {
            connection.closeAndAwait(new CloseReason(NOT_FOUND, "project_not_found"));
            return;
        }
        connection.userData().put(ACCOUNT, session.get().accountId().toString());
        connection.userData().put(NAME, OfficiumSession.actorOf(session.get()).name());
    }

    @OnTextMessage
    public void onText(String text) {
        String account = connection.userData().get(ACCOUNT);
        if (account == null) {
            return;
        }
        JsonNode frame;
        try {
            frame = mapper.readTree(text);
        } catch (Exception malformed) {
            return;
        }
        String type = frame.path("type").asText();
        String transferId = frame.path("transferId").asText("");
        if (!type.equals("upload") && !type.equals("download")) {
            switchboard.fromBrowser(connection.id(), frame);
            return;
        }
        if (!TRANSFER_ID.matcher(transferId).matches() || switchboard.isKnown(transferId)) {
            switchboard.send(connection.id(), switchboard.error(transferId, "invalid_transfer_id",
                    "transferId must be a new lower-case UUID"));
            return;
        }
        UUID accountId = UUID.fromString(account);
        try {
            if (type.equals("upload")) {
                Actor actor = Actor.person(accountId, connection.userData().get(NAME));
                switchboard.startUpload(transferId, connection.id(), attachments.beginUpload(accountId, projectId(),
                        frame.path("cardId").asText(), frame.path("name").asText(null),
                        frame.path("contentType").asText(null), frame.path("size").asLong(0), actor));
            } else {
                switchboard.startDownload(transferId, connection.id(), attachments.beginDownload(accountId,
                        projectId(), frame.path("cardId").asText(),
                        UUID.fromString(frame.path("attachmentId").asText())));
            }
        } catch (OfficiumException refused) {
            switchboard.send(connection.id(), switchboard.error(transferId, refused.code(), refused.getMessage()));
        } catch (IllegalArgumentException malformed) {
            switchboard.send(connection.id(), switchboard.error(transferId, "invalid_params", malformed.getMessage()));
        }
    }

    @OnBinaryMessage
    public void onBinary(Buffer data) {
        if (connection.userData().get(ACCOUNT) != null) {
            switchboard.relayFromBrowser(connection.id(), data.getBytes());
        }
    }

    @OnClose
    public void onClose() {
        switchboard.connectionClosed(connection.id());
    }

    private UUID projectId() {
        return UUID.fromString(connection.pathParam("projectId"));
    }

    private Optional<String> sessionCookie() {
        String header = connection.handshakeRequest().header("Cookie");
        if (header == null) {
            return Optional.empty();
        }
        for (String part : header.split(";")) {
            String trimmed = part.trim();
            if (trimmed.startsWith(OfficiumSession.COOKIE + "=")) {
                return Optional.of(trimmed.substring(OfficiumSession.COOKIE.length() + 1));
            }
        }
        return Optional.empty();
    }
}
