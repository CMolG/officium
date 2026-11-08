package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.DocCommentService;
import com.javadaba.contexts.officium.application.DocCommentService.State;
import com.javadaba.contexts.officium.domain.DocQuote;
import com.javadaba.contexts.officium.domain.OfficiumException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * {@code /officium/v1/projects/{projectId}/docs/{path}/_comments} (JAVA-797, contract §8.25): the comment threads of
 * a page. Its own class, like {@code _files}, because the page routes' {@code /docs/{path: .+}} would swallow the
 * path; this template carries more literal text, so it wins for these URLs.
 */
@Path("/officium/v1/projects/{projectId}/docs/{path: .+}/_comments")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumDocCommentsResource {

    /** The ids are UUIDs, so {@code :resolve} can't be read as part of one. */
    private static final String ID = "/{id: [0-9a-fA-F-]{36}}";

    public record QuoteBody(String exact, String prefix, String suffix) {
        DocQuote toQuote() {
            return new DocQuote(exact, prefix, suffix);
        }
    }

    public record CommentRequest(String text, QuoteBody quote, UUID parentId) {
    }

    public record TextRequest(String text) {
    }

    public record ReactionRequest(String emoji) {
    }

    private final DocCommentService comments;
    private final AccountSessionCodec codec;

    public OfficiumDocCommentsResource(DocCommentService comments, AccountSessionCodec codec) {
        this.comments = comments;
        this.codec = codec;
    }

    @GET
    public Object list(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("projectId") UUID projectId,
            @PathParam("path") String path, @QueryParam("state") String state) {
        AccountSession account = OfficiumSession.require(codec, session);
        return comments.list(account.accountId(), projectId, path, State.parse(state));
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public jakarta.ws.rs.core.Response add(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path, CommentRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        CommentRequest body = request == null ? new CommentRequest(null, null, null) : request;
        var thread = comments.add(account.accountId(), projectId, path, body.text(),
                body.quote() == null ? null : body.quote().toQuote(), body.parentId(),
                OfficiumSession.actorOf(account));
        return jakarta.ws.rs.core.Response.status(jakarta.ws.rs.core.Response.Status.CREATED).entity(thread).build();
    }

    @PATCH
    @Path(ID)
    @Consumes(MediaType.APPLICATION_JSON)
    public Object edit(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("projectId") UUID projectId,
            @PathParam("path") String path, @PathParam("id") UUID id, TextRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return comments.edit(account.accountId(), projectId, path, id, request == null ? null : request.text(),
                OfficiumSession.actorOf(account));
    }

    /** {@code {deleted, thread}}: {@code thread} is {@code null} when the whole thread went. */
    @DELETE
    @Path(ID)
    public Object delete(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("projectId") UUID projectId,
            @PathParam("path") String path, @PathParam("id") UUID id) {
        AccountSession account = OfficiumSession.require(codec, session);
        var thread = comments.delete(account.accountId(), projectId, path, id, OfficiumSession.actorOf(account));
        Map<String, Object> answer = new LinkedHashMap<>();
        answer.put("deleted", true);
        answer.put("thread", thread);
        return answer;
    }

    @POST
    @Path(ID + ":resolve")
    public Object resolve(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path, @PathParam("id") UUID id) {
        AccountSession account = OfficiumSession.require(codec, session);
        return comments.resolve(account.accountId(), projectId, path, id, OfficiumSession.actorOf(account));
    }

    @POST
    @Path(ID + ":unresolve")
    public Object unresolve(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path, @PathParam("id") UUID id) {
        AccountSession account = OfficiumSession.require(codec, session);
        return comments.unresolve(account.accountId(), projectId, path, id, OfficiumSession.actorOf(account));
    }

    @POST
    @Path(ID + ":react")
    @Consumes(MediaType.APPLICATION_JSON)
    public Object react(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("projectId") UUID projectId,
            @PathParam("path") String path, @PathParam("id") UUID id, ReactionRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return comments.react(account.accountId(), projectId, path, id, emoji(request),
                OfficiumSession.actorOf(account));
    }

    @POST
    @Path(ID + ":unreact")
    @Consumes(MediaType.APPLICATION_JSON)
    public Object unreact(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path, @PathParam("id") UUID id,
            ReactionRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return comments.unreact(account.accountId(), projectId, path, id, emoji(request),
                OfficiumSession.actorOf(account));
    }

    private static String emoji(ReactionRequest request) {
        if (request == null || request.emoji() == null) {
            throw OfficiumException.badRequest("invalid_reaction", "A reaction is exactly one emoji");
        }
        return request.emoji();
    }
}
