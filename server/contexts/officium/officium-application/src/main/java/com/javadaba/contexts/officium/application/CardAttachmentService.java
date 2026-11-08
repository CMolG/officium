package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.AttachmentContentTypes;
import com.javadaba.contexts.officium.domain.AttachmentPaths;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardAttachment;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.StorageUsage;
import com.javadaba.contexts.officium.domain.ports.CardAttachmentRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Attachments whose bytes live on the project's machine (JDB-242). This service never sees a
 * byte: it decides whether a transfer may start, where the file goes, and records the attachment
 * once the machine confirms it stored it. The bytes themselves travel browser <-> machine, peer to
 * peer or relayed through the API socket without being kept ({@code OfficiumFileSwitchboard}).
 * Still ≤10MB per file with allowlisted content types (contract §3).
 */
@ApplicationScoped
public class CardAttachmentService {

    public static final long MAX_SIZE_BYTES = 10L * 1024 * 1024;

    private final CardAttachmentRepository attachments;
    private final CardRepository cards;
    private final ProjectAccessGuard guard;
    private final CardService cardService;
    private final ActivityPublisher activity;
    private final ProjectMachineService machines;
    private final StorageQuotaService quota;
    private final Clock clock;

    @Inject
    public CardAttachmentService(CardAttachmentRepository attachments, CardRepository cards, ProjectAccessGuard guard,
            CardService cardService, ActivityPublisher activity, ProjectMachineService machines,
            StorageQuotaService quota) {
        this.attachments = attachments;
        this.cards = cards;
        this.guard = guard;
        this.cardService = cardService;
        this.activity = activity;
        this.machines = machines;
        this.quota = quota;
        this.clock = Clock.systemUTC();
    }

    public List<CardAttachment> list(UUID accountId, UUID projectId, String keyOrId) {
        UUID cardId = cardService.resolveCardId(accountId, projectId, keyOrId);
        return attachments.listByCard(cardId);
    }

    /** Validates an upload before any byte moves, and fixes the path the machine must write to. */
    public UploadTicket beginUpload(UUID accountId, UUID projectId, String keyOrId, String fileName,
            String contentType, long size, Actor actor) {
        var access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        UUID cardId = cardService.resolveCardId(accountId, projectId, keyOrId);
        if (size <= 0) {
            throw OfficiumException.badRequest("empty_attachment", "The file is empty");
        }
        if (size > MAX_SIZE_BYTES) {
            throw OfficiumException.badRequest("attachment_too_large", "Attachments are capped at 10MB");
        }
        String type = contentType == null || contentType.isBlank() ? "application/octet-stream" : contentType;
        if (!AttachmentContentTypes.ALLOWED.contains(type)) {
            throw OfficiumException.badRequest("attachment_type_not_allowed",
                    "Content type " + type + " is not allowed");
        }
        String name = fileName == null || fileName.isBlank() ? "file" : fileName.strip();
        UUID attachmentId = UUID.randomUUID();
        String path = AttachmentPaths.forUpload(requireCard(projectId, cardId).key(), name, attachmentId);
        quota.requireRoom(access.project(), StorageUsage.bytesOf(name, path));
        String machine = machines.requireConnection(projectId);
        return new UploadTicket(attachmentId, projectId, cardId, name, size, type, path, machine, actor);
    }

    /** The machine stored the file: the attachment exists from now on. */
    public CardAttachment completeUpload(UploadTicket ticket, long storedSize) {
        if (storedSize != ticket.size()) {
            throw OfficiumException.badRequest("attachment_size_mismatch",
                    "The machine stored " + storedSize + " bytes, " + ticket.size() + " were announced");
        }
        Instant now = Instant.now(clock);
        CardAttachment saved = attachments.insert(new CardAttachment(ticket.attachmentId(), ticket.cardId(),
                ticket.name(), ticket.size(), ticket.contentType(), ticket.path(), now));
        // A file a person attaches is often the very thing a "needs a person" card asked for.
        Card card = touchCard(ticket.projectId(), ticket.cardId(), ticket.actor(), true);
        String cardKey = card == null ? null : card.key();
        activity.record(ticket.projectId(), ticket.cardId(), cardKey, ticket.actor(), "card.attachment",
                "Attachment \"" + saved.name() + "\" added", now);
        activity.publish("card.attachment", ticket.projectId(), ticket.cardId(), cardKey, null, ticket.actor(), now);
        return saved;
    }

    /** Readers can open an attachment; the machine must be online to serve it. */
    public DownloadTicket beginDownload(UUID accountId, UUID projectId, String keyOrId, UUID attachmentId) {
        UUID cardId = cardService.resolveCardId(accountId, projectId, keyOrId);
        CardAttachment attachment = attachments.findById(cardId, attachmentId)
                .orElseThrow(() -> OfficiumException.notFound("attachment_not_found", "No such attachment"));
        return new DownloadTicket(attachment, machines.requireConnection(projectId));
    }

    /** @return the removed attachment, so the caller can ask the machine to delete its file. */
    public CardAttachment delete(UUID accountId, UUID projectId, String keyOrId, UUID attachmentId, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        UUID cardId = cardService.resolveCardId(accountId, projectId, keyOrId);
        CardAttachment attachment = attachments.findById(cardId, attachmentId)
                .orElseThrow(() -> OfficiumException.notFound("attachment_not_found", "No such attachment"));
        attachments.delete(cardId, attachmentId);
        touchCard(projectId, cardId, actor, false);
        return attachment;
    }

    private Card requireCard(UUID projectId, UUID cardId) {
        return cards.findById(projectId, cardId)
                .orElseThrow(() -> OfficiumException.notFound("card_not_found", "No such card"));
    }

    /** {@code addsContent}: a person doing this counts as a human edit of the card. */
    private Card touchCard(UUID projectId, UUID cardId, Actor actor, boolean addsContent) {
        Card current = cards.findById(projectId, cardId).orElse(null);
        if (current == null) {
            return null;
        }
        Instant now = Instant.now(clock);
        Card touched = addsContent ? current.editedBy(actor, now) : current.touched(actor, now);
        cards.updateIfVersion(touched, current.version());
        cardService.reindex(touched);
        return touched;
    }

    /** An upload the API has accepted; lives only as long as its transfer. */
    public record UploadTicket(UUID attachmentId, UUID projectId, UUID cardId, String name, long size,
            String contentType, String path, String machineConnectionId, Actor actor) {
    }

    public record DownloadTicket(CardAttachment attachment, String machineConnectionId) {
    }
}
