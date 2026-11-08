package com.javadaba.apps.api.officium;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.javadaba.contexts.officium.application.AttachmentView;
import com.javadaba.contexts.officium.application.CardAttachmentService;
import com.javadaba.contexts.officium.application.CardAttachmentService.DownloadTicket;
import com.javadaba.contexts.officium.application.CardAttachmentService.UploadTicket;
import com.javadaba.contexts.officium.application.ProjectMachineService;
import com.javadaba.contexts.officium.domain.OfficiumException;
import io.quarkus.logging.Log;
import io.quarkus.websockets.next.OpenConnections;
import io.vertx.core.buffer.Buffer;
import jakarta.enterprise.context.ApplicationScoped;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * The switchboard between a browser and a project's machine (JDB-242). It keeps no byte: it pairs
 * the two connections of a transfer, forwards WebRTC signalling so they can talk peer to peer,
 * and when ICE does not connect it forwards the relayed chunks as they arrive, counting them.
 *
 * <p>Wire, both sockets: JSON text frames {@code {type, transferId, ...}} for control and
 * signalling; binary frames {@code [36-byte transfer id][chunk]} for relayed bytes. A frame is only
 * accepted from the connection that owns that end of the transfer, so neither side can inject
 * into someone else's.
 *
 * <p>In memory and single-instance, like the machines themselves ({@link ProjectMachineService}).
 * Connections are looked up fresh in {@link OpenConnections} on every send: the injected
 * {@code WebSocketConnection} is scoped to its own callback (see {@code FluxorRelaySocket}).
 */
@ApplicationScoped
public class OfficiumFileSwitchboard {

    static final int ID_BYTES = 36;

    private final OpenConnections open;
    private final CardAttachmentService attachments;
    private final ProjectMachineService machines;
    private final ObjectMapper mapper;
    private final Map<String, Transfer> transfers = new ConcurrentHashMap<>();

    public OfficiumFileSwitchboard(OpenConnections open, CardAttachmentService attachments,
            ProjectMachineService machines, ObjectMapper mapper) {
        this.open = open;
        this.attachments = attachments;
        this.machines = machines;
        this.mapper = mapper;
    }

    // ── starting a transfer (the browser socket has validated it through the service) ──────────

    void startUpload(String transferId, String browser, UploadTicket ticket) {
        transfers.put(transferId, new Transfer(transferId, browser, ticket.machineConnectionId(), ticket,
                ticket.size()));
        send(ticket.machineConnectionId(), message("incoming", transferId).put("path", ticket.path())
                .put("name", ticket.name()).put("size", ticket.size()).put("contentType", ticket.contentType()));
        send(browser, message("accepted", transferId).put("path", ticket.path()));
    }

    void startDownload(String transferId, String browser, DownloadTicket ticket) {
        var attachment = ticket.attachment();
        transfers.put(transferId, new Transfer(transferId, browser, ticket.machineConnectionId(), null,
                attachment.size()));
        send(ticket.machineConnectionId(), message("serve", transferId).put("path", attachment.path()));
        send(browser, message("accepted", transferId).put("path", attachment.path())
                .put("name", attachment.name()).put("size", attachment.size())
                .put("contentType", attachment.contentType()));
    }

    boolean isKnown(String transferId) {
        return transfers.containsKey(transferId);
    }

    // ── control frames ────────────────────────────────────────────────────────────────────────

    /** {@code signal} (WebRTC offer/answer/candidate), {@code relay} (fall back), {@code eof} (all
     *  relayed chunks sent) and {@code cancel}, from the browser to the machine. */
    void fromBrowser(String browser, JsonNode frame) {
        Transfer transfer = owned(frame, browser, true);
        if (transfer == null) {
            return;
        }
        String type = frame.path("type").asText();
        switch (type) {
            case "signal", "relay", "eof" -> send(transfer.machine(), frame);
            case "cancel" -> end(transfer, "cancel", null, null);
            default -> send(browser, error(transfer.id(), "unknown_message", "Unknown message type " + type));
        }
    }

    /** {@code signal}, {@code relay} and {@code eof} go to the browser; {@code stored} completes an
     *  upload; {@code error} fails the transfer with the machine's reason. */
    void fromMachine(String machine, JsonNode frame) {
        Transfer transfer = owned(frame, machine, false);
        if (transfer == null) {
            return;
        }
        String type = frame.path("type").asText();
        switch (type) {
            case "signal", "relay" -> send(transfer.browser(), frame);
            case "eof" -> {
                send(transfer.browser(), frame);
                transfers.remove(transfer.id());
            }
            case "stored" -> completeUpload(transfer, frame.path("size").asLong(-1));
            case "error" -> end(transfer, "error", frame.path("error").asText("machine_error"),
                    frame.path("message").asText("The machine could not handle the file"));
            default -> Log.debugf("officium files: ignoring machine frame of type %s", type);
        }
    }

    private void completeUpload(Transfer transfer, long storedSize) {
        if (transfer.upload() == null) {
            return;
        }
        transfers.remove(transfer.id());
        try {
            var saved = attachments.completeUpload(transfer.upload(), storedSize);
            send(transfer.browser(), message("done", transfer.id()).set("attachment",
                    mapper.valueToTree(AttachmentView.of(saved))));
        } catch (OfficiumException ex) {
            send(transfer.browser(), error(transfer.id(), ex.code(), ex.getMessage()));
            send(transfer.machine(), message("delete", transfer.id()).put("path", transfer.upload().path()));
        }
    }

    // ── relayed bytes ─────────────────────────────────────────────────────────────────────────

    void relayFromBrowser(String browser, byte[] frame) {
        Transfer transfer = ownedBinary(frame, browser, true);
        if (transfer == null) {
            return;
        }
        // The browser declared the size; more bytes than that is a lie or a bug, and either way the
        // relay stops here rather than trusting the machine to notice.
        if (transfer.relayed().addAndGet(frame.length - ID_BYTES) > transfer.size()) {
            end(transfer, "error", "attachment_size_mismatch", "More bytes were sent than announced");
            return;
        }
        sendBinary(transfer.machine(), frame);
    }

    void relayFromMachine(String machine, byte[] frame) {
        Transfer transfer = ownedBinary(frame, machine, false);
        if (transfer != null) {
            sendBinary(transfer.browser(), frame);
        }
    }

    // ── endings ───────────────────────────────────────────────────────────────────────────────

    void connectionClosed(String connectionId) {
        transfers.values().stream()
                .filter(t -> t.browser().equals(connectionId) || t.machine().equals(connectionId))
                .toList()
                .forEach(t -> end(t, "error", "transfer_interrupted",
                        t.browser().equals(connectionId) ? "The browser went away" : "The machine disconnected"));
    }

    /** Best effort: the attachment row is already gone; an offline machine keeps an orphan file in
     *  its own directory, which costs our server nothing. */
    void deleteOnMachine(UUID projectId, String path) {
        try {
            send(machines.requireConnection(projectId), message("delete", null).put("path", path));
        } catch (OfficiumException offline) {
            Log.debugf("officium files: machine offline, %s stays on it", path);
        }
    }

    private void end(Transfer transfer, String type, String code, String reason) {
        if (transfers.remove(transfer.id()) == null) {
            return;
        }
        ObjectNode frame = code == null ? message(type, transfer.id()) : error(transfer.id(), code, reason);
        send(transfer.browser(), frame);
        send(transfer.machine(), message("cancel", transfer.id()));
    }

    // ── helpers ───────────────────────────────────────────────────────────────────────────────

    private Transfer owned(JsonNode frame, String connection, boolean fromBrowser) {
        Transfer transfer = transfers.get(frame.path("transferId").asText(""));
        if (transfer == null || !(fromBrowser ? transfer.browser() : transfer.machine()).equals(connection)) {
            return null;
        }
        return transfer;
    }

    private Transfer ownedBinary(byte[] frame, String connection, boolean fromBrowser) {
        if (frame.length <= ID_BYTES) {
            return null;
        }
        String id = new String(frame, 0, ID_BYTES, StandardCharsets.US_ASCII);
        Transfer transfer = transfers.get(id);
        if (transfer == null || !(fromBrowser ? transfer.browser() : transfer.machine()).equals(connection)) {
            return null;
        }
        return transfer;
    }

    ObjectNode message(String type, String transferId) {
        ObjectNode node = mapper.createObjectNode().put("type", type);
        if (transferId != null) {
            node.put("transferId", transferId);
        }
        return node;
    }

    ObjectNode error(String transferId, String code, String message) {
        return message("error", transferId).put("error", code).put("message", message);
    }

    void send(String connectionId, JsonNode frame) {
        open.findByConnectionId(connectionId).ifPresent(connection -> {
            try {
                connection.sendTextAndAwait(mapper.writeValueAsString(frame));
            } catch (Exception ex) {
                Log.debugf("officium files: send to %s failed: %s", connectionId, ex.getMessage());
            }
        });
    }

    private void sendBinary(String connectionId, byte[] frame) {
        open.findByConnectionId(connectionId).ifPresent(connection -> {
            try {
                connection.sendBinaryAndAwait(Buffer.buffer(frame));
            } catch (Exception ex) {
                Log.debugf("officium files: relay to %s failed: %s", connectionId, ex.getMessage());
            }
        });
    }

    /** {@code upload} is null for a download: only an upload has an attachment to record at the end. */
    private record Transfer(String id, String browser, String machine, UploadTicket upload, long size,
            AtomicLong relayed) {

        Transfer(String id, String browser, String machine, UploadTicket upload, long size) {
            this(id, browser, machine, upload, size, new AtomicLong());
        }
    }
}
