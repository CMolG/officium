package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.AttachmentContentTypes;
import com.javadaba.contexts.officium.domain.DocAttachment;
import com.javadaba.contexts.officium.domain.DocAttachmentGarbage;
import com.javadaba.contexts.officium.domain.DocFileRefs;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.DocAttachmentRepository;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import com.javadaba.platform.image.ImageLimits;
import com.javadaba.platform.image.ImageReducer;
import com.javadaba.platform.image.ImageRefusedException;
import com.javadaba.platform.image.ImageSniff;
import com.javadaba.platform.image.KeepAsSent;
import com.javadaba.platform.image.ReducedImage;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * The files and images of a documentation page (JAVA-798, ADR 0023). The bytes live in the
 * database; an image is reduced on the server, in Java, before it is kept, so what is stored is
 * never larger than what was sent and never carries its EXIF, GPS or XMP.
 *
 * <p>Who may read a file is who may read its page (an unpublished draft is its creator's, a
 * trashed page answers 404); who may add or delete one is who may edit pages. A page is never
 * trusted with a remote image: the only addressing is {@code doc://<page>/_files/<name>}.
 *
 * <p>A moved page keeps its files, and links are never rewritten (JAVA-792, ADR 0022): reads and the sweep
 * follow a redirect from an old path, writes don't.
 */
@ApplicationScoped
public class DocAttachmentService {

    public static final long REST_MAX_BYTES = 10L * 1024 * 1024;
    public static final long MCP_MAX_BYTES = 5L * 1024 * 1024;

    private final DocPageRepository docs;
    private final DocAttachmentRepository attachments;
    private final ProjectAccessGuard guard;
    private final DocRedirectResolver redirects;
    private final StorageQuotaService quota;
    private final long maxPixels;
    private final Semaphore reducing;
    private final long busyWaitSeconds;
    private final Clock clock;

    @Inject
    public DocAttachmentService(DocPageRepository docs, DocAttachmentRepository attachments,
            ProjectAccessGuard guard, DocRedirectResolver redirects, StorageQuotaService quota,
            @ConfigProperty(name = "officium.docs.images.max-pixels", defaultValue = "25000000") long maxPixels,
            @ConfigProperty(name = "officium.docs.images.concurrency", defaultValue = "1") int concurrency,
            @ConfigProperty(name = "officium.docs.images.busy-wait-seconds", defaultValue = "30") long busyWait) {
        this(docs, attachments, guard, redirects, quota, maxPixels, concurrency, busyWait, Clock.systemUTC());
    }

    DocAttachmentService(DocPageRepository docs, DocAttachmentRepository attachments, ProjectAccessGuard guard,
            DocRedirectResolver redirects, StorageQuotaService quota, long maxPixels, int concurrency, long busyWait,
            Clock clock) {
        this.docs = docs;
        this.attachments = attachments;
        this.guard = guard;
        this.redirects = redirects;
        this.quota = quota;
        this.maxPixels = maxPixels;
        this.reducing = new Semaphore(Math.max(1, concurrency));
        this.busyWaitSeconds = busyWait;
        this.clock = clock;
    }

    /** What an upload answers: the stored file, the reference to write into the page, and the saving. */
    public record Uploaded(DocAttachment attachment, String uri, boolean reduced) {
    }

    /** A file to serve: its row and its bytes. */
    public record Content(DocAttachment attachment, byte[] data) {
    }

    public List<DocAttachment> list(UUID accountId, UUID projectId, String path) {
        return attachments.listByPage(readablePage(accountId, projectId, path).id());
    }

    /** A file's row alone, for a conditional read that never loads its bytes. */
    public DocAttachment meta(UUID accountId, UUID projectId, String path, String name) {
        return attachments.find(readablePage(accountId, projectId, path).id(), name)
                .orElseThrow(DocAttachmentService::notFound);
    }

    public Content read(UUID accountId, UUID projectId, String path, String name) {
        DocPage page = readablePage(accountId, projectId, path);
        DocAttachment attachment = attachments.find(page.id(), name).orElseThrow(DocAttachmentService::notFound);
        byte[] data = attachments.readData(attachment.id()).orElseThrow(DocAttachmentService::notFound);
        return new Content(attachment, data);
    }

    public Uploaded upload(UUID accountId, UUID projectId, String path, String name, String declaredType,
            byte[] bytes, long maxBytes, Actor actor) {
        String normalized = DocPage.normalizePath(path);
        guard.requireAccess(projectId, accountId);
        if (DocPage.isBuiltin(normalized)) {
            throw OfficiumException.forbidden("builtin_doc_read_only", "Pages under \"" + DocPage.BUILTIN_PREFIX
                    + "/\" are Officium's own documentation: nobody can add files to them");
        }
        var access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage page = docs.find(projectId, normalized).filter(p -> p.visibleTo(accountId))
                .orElseThrow(DocAttachmentService::pageNotFound);
        if (page.lifecycle().archived()) {
            throw OfficiumException.conflict("doc_archived", "\"" + normalized + "\" is archived: unarchive it first");
        }
        DocAttachment.requireName(name);
        if (bytes == null || bytes.length == 0) {
            throw OfficiumException.badRequest("attachment_empty", "The file is empty");
        }
        if (bytes.length > maxBytes) {
            throw new OfficiumException("attachment_too_large", String.format(Locale.ROOT,
                    "The file is %.1f MB; a page takes files up to %d MB", bytes.length / 1048576.0,
                    maxBytes / 1048576), 413);
        }
        Prepared prepared = prepare(bytes, declaredType);
        quota.requireRoom(access.project(), prepared.data().length);
        DocAttachment row = new DocAttachment(UUID.randomUUID(), projectId, page.id(), name, prepared.kind(),
                prepared.contentType(), bytes.length, prepared.data().length, prepared.width(), prepared.height(),
                sha256(prepared.data()), actor, Instant.now(clock));
        if (!attachments.insert(row, prepared.data())) {
            throw OfficiumException.conflict("attachment_exists", "\"" + name + "\" is already attached to this page: "
                    + "delete it first, or give the new file another name");
        }
        return new Uploaded(row, DocFileRefs.uri(normalized, name), prepared.data().length < bytes.length);
    }

    public void delete(UUID accountId, UUID projectId, String path, String name) {
        String normalized = DocPage.normalizePath(path);
        guard.requireAccess(projectId, accountId);
        if (DocPage.isBuiltin(normalized)) {
            throw OfficiumException.forbidden("builtin_doc_read_only", "Officium's own pages have no files to delete");
        }
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        DocPage page = docs.find(projectId, normalized).filter(p -> p.visibleTo(accountId))
                .orElseThrow(DocAttachmentService::pageNotFound);
        if (!attachments.delete(page.id(), name)) {
            throw notFound();
        }
    }

    /**
     * The hourly sweep's step: deletes the attachments, older than their grace, that no current body
     * (the trash included) and no kept revision of their project references.
     */
    public int sweep() {
        Instant now = Instant.now(clock);
        List<DocAttachment> old = attachments.listCreatedBefore(now.minus(DocAttachmentGarbage.GRACE));
        Map<UUID, List<DocAttachment>> byProject = old.stream()
                .collect(java.util.stream.Collectors.groupingBy(DocAttachment::projectId));
        int deleted = 0;
        for (var entry : byProject.entrySet()) {
            UUID projectId = entry.getKey();
            Map<String, List<UUID>> pages = new HashMap<>(attachments.pageIdsByPath(projectId));
            Set<DocAttachmentGarbage.Key> referenced = new HashSet<>();
            for (String body : attachments.bodiesReferencingFiles(projectId)) {
                for (DocFileRefs.Ref ref : DocFileRefs.in(body)) {
                    // A path no page holds may be one that moved: its files went with the page.
                    List<UUID> ids = pages.computeIfAbsent(ref.pagePath(), path -> redirects.follow(projectId, path)
                            .map(followed -> List.of(followed.page().id())).orElse(List.of()));
                    for (UUID pageId : ids) {
                        referenced.add(new DocAttachmentGarbage.Key(pageId, ref.name()));
                    }
                }
            }
            for (DocAttachment garbage : DocAttachmentGarbage.of(entry.getValue(), referenced, now)) {
                if (attachments.deleteById(garbage.id())) {
                    deleted++;
                }
            }
        }
        return deleted;
    }

    private DocPage readablePage(UUID accountId, UUID projectId, String path) {
        guard.requireAccess(projectId, accountId);
        String normalized = DocPage.normalizePath(path);
        if (DocPage.isBuiltin(normalized)) {
            throw pageNotFound();
        }
        return docs.find(projectId, normalized).filter(p -> p.visibleTo(accountId))
                .or(() -> redirects.follow(projectId, normalized).map(DocRedirectResolver.Followed::page)
                        .filter(p -> p.visibleTo(accountId)))
                .orElseThrow(DocAttachmentService::pageNotFound);
    }

    private record Prepared(DocAttachment.Kind kind, String contentType, byte[] data, int width, int height) {
    }

    private Prepared prepare(byte[] bytes, String declaredType) {
        ImageSniff.Kind sniffed = ImageSniff.sniff(bytes);
        ImageLimits limits = new ImageLimits(Math.max(bytes.length, 1), maxPixels);
        try {
            switch (sniffed) {
                case JPEG, PNG :
                    ReducedImage reduced = reduce(bytes, limits);
                    String type = sniffed == ImageSniff.Kind.JPEG ? "image/jpeg" : "image/png";
                    byte[] data = reduced.bytes().length <= bytes.length ? reduced.bytes() : bytes;
                    return new Prepared(DocAttachment.Kind.IMAGE, type, data, reduced.width(), reduced.height());
                case GIF, WEBP :
                    String animated = sniffed == ImageSniff.Kind.GIF ? "image/gif" : "image/webp";
                    return new Prepared(DocAttachment.Kind.IMAGE, animated, KeepAsSent.strip(bytes, sniffed, limits),
                            0, 0);
                case APNG, AVIF, HEIF, TIFF :
                    throw new OfficiumException("unsupported_image", unsupportedImageWords(sniffed), 415);
                default :
                    return file(bytes, declaredType);
            }
        } catch (ImageRefusedException ex) {
            throw refusal(ex);
        }
    }

    private ReducedImage reduce(byte[] bytes, ImageLimits limits) {
        try {
            if (!reducing.tryAcquire(busyWaitSeconds, TimeUnit.SECONDS)) {
                throw new OfficiumException("image_busy", "Other images are being optimized right now: try again in "
                        + "a moment", 503);
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new OfficiumException("image_busy", "The upload was interrupted: try again", 503);
        }
        try {
            return new ImageReducer(limits).reduce(bytes);
        } finally {
            reducing.release();
        }
    }

    private static Prepared file(byte[] bytes, String declaredType) {
        String type = declaredType == null || declaredType.isBlank()
                ? "application/octet-stream"
                : declaredType.split(";")[0].strip().toLowerCase(Locale.ROOT);
        if (type.startsWith("image/") && !type.equals("image/svg+xml")) {
            throw OfficiumException.badRequest("image_malformed", "The file is not a readable image: export it again "
                    + "as a PNG or JPEG");
        }
        if (!AttachmentContentTypes.ALLOWED.contains(type)) {
            throw new OfficiumException("unsupported_attachment_type", "Files of type " + type + " are not accepted "
                    + "(SVG is code, so it is never kept). A page takes images (JPEG, PNG, GIF, WebP), PDF, text, CSV, "
                    + "JSON, ZIP and Word or Excel files", 415);
        }
        return new Prepared(DocAttachment.Kind.FILE, type, bytes, 0, 0);
    }

    private static String unsupportedImageWords(ImageSniff.Kind kind) {
        String what = switch (kind) {
            case AVIF -> "AVIF";
            case HEIF -> "HEIC";
            case TIFF -> "TIFF";
            default -> "animated PNG";
        };
        return what + " images cannot be added: export the image as a PNG or JPEG and add that";
    }

    private static OfficiumException refusal(ImageRefusedException ex) {
        return switch (ex.reason()) {
            case TOO_MANY_PIXELS -> OfficiumException.badRequest("image_too_many_pixels",
                    "The image is too large in pixels (" + ex.detail() + "): scale it down and add it again");
            case TOO_MANY_BYTES -> new OfficiumException("attachment_too_large", "The file is too large", 413);
            case UNSUPPORTED_FORMAT -> new OfficiumException("unsupported_image", "This image format cannot be added: "
                    + "export it as a PNG or JPEG", 415);
            case MALFORMED -> OfficiumException.badRequest("image_malformed", "The file is not a readable image: "
                    + "export it again as a PNG or JPEG");
        };
    }

    private static String sha256(byte[] data) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static OfficiumException notFound() {
        return OfficiumException.notFound("attachment_not_found", "No such file on this page");
    }

    private static OfficiumException pageNotFound() {
        return OfficiumException.notFound("doc_not_found", "No such page");
    }
}
