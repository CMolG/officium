package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.DocAttachmentService;
import com.javadaba.contexts.officium.application.DocAttachmentView;
import com.javadaba.contexts.officium.domain.DocAttachment;
import com.javadaba.contexts.officium.domain.DocPage;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * {@code /officium/v1/projects/{projectId}/docs/{path}/_files} (JAVA-798, contract §8.7): the files and
 * images of a page. Its own class because the page routes' {@code /docs/{path: .+}} would swallow the
 * path; this template carries more literal text, so it wins for these URLs.
 *
 * <p>A file is served under a locked-down policy whatever it is: the stored type, {@code nosniff} and a
 * sandboxing CSP, inline only for the four image types a page draws.
 */
@Path("/officium/v1/projects/{projectId}/docs/{path: .+}/_files")
public class OfficiumDocFilesResource {

    private static final Set<String> INLINE = Set.of("image/png", "image/jpeg", "image/gif", "image/webp");

    private final DocAttachmentService files;
    private final AccountSessionCodec codec;

    public OfficiumDocFilesResource(DocAttachmentService files, AccountSessionCodec codec) {
        this.files = files;
        this.codec = codec;
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<DocAttachmentView> list(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path) {
        AccountSession account = OfficiumSession.require(codec, session);
        String normalized = DocPage.normalizePath(path);
        return files.list(account.accountId(), projectId, path).stream()
                .map(a -> DocAttachmentView.of(a, normalized)).toList();
    }

    @GET
    @Path("/{name}")
    // JSON first: an error answer has no type of its own, and negotiates to this list's head.
    @Produces({MediaType.APPLICATION_JSON, MediaType.WILDCARD})
    public Response read(@CookieParam(OfficiumSession.COOKIE) String session,
            @HeaderParam(HttpHeaders.IF_NONE_MATCH) String ifNoneMatch, @PathParam("projectId") UUID projectId,
            @PathParam("path") String path, @PathParam("name") String name) {
        AccountSession account = OfficiumSession.require(codec, session);
        DocAttachment meta = files.meta(account.accountId(), projectId, path, name);
        String etag = "\"" + meta.sha256() + "\"";
        Response.ResponseBuilder answer = etag.equals(ifNoneMatch)
                ? Response.notModified()
                : Response.ok(files.read(account.accountId(), projectId, path, name).data(), meta.contentType());
        String disposition = INLINE.contains(meta.contentType()) ? "inline" : "attachment";
        return answer.header(HttpHeaders.ETAG, etag).header(HttpHeaders.CACHE_CONTROL, "private, no-cache")
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox; frame-ancestors 'none'")
                .header("Content-Disposition", disposition + "; filename=\"" + name + "\"").build();
    }

    @PUT
    @Path("/{name}")
    @Consumes(MediaType.WILDCARD)
    @Produces(MediaType.APPLICATION_JSON)
    public Response upload(@CookieParam(OfficiumSession.COOKIE) String session,
            @HeaderParam(HttpHeaders.CONTENT_TYPE) String contentType, @PathParam("projectId") UUID projectId,
            @PathParam("path") String path, @PathParam("name") String name, byte[] body) {
        AccountSession account = OfficiumSession.require(codec, session);
        DocAttachmentService.Uploaded uploaded = files.upload(account.accountId(), projectId, path, name,
                contentType, body, DocAttachmentService.REST_MAX_BYTES, OfficiumSession.actorOf(account));
        return Response.status(Response.Status.CREATED)
                .entity(DocAttachmentView.of(uploaded.attachment(), DocPage.normalizePath(path))).build();
    }

    @DELETE
    @Path("/{name}")
    public Response delete(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path,
            @PathParam("name") String name) {
        AccountSession account = OfficiumSession.require(codec, session);
        files.delete(account.accountId(), projectId, path, name);
        return Response.noContent().build();
    }
}
