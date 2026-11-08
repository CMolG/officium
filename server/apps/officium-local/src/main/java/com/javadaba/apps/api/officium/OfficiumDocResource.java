package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.DocImportService;
import com.javadaba.contexts.officium.application.DocMoveService;
import com.javadaba.contexts.officium.application.DocPageView;
import com.javadaba.contexts.officium.application.DocLifecycleService;
import com.javadaba.contexts.officium.application.DocPresenceService;
import com.javadaba.contexts.officium.application.DocRoomService;
import com.javadaba.contexts.officium.application.DocSearchService;
import com.javadaba.contexts.officium.application.DocService;
import com.javadaba.contexts.officium.application.DocStarService;
import com.javadaba.contexts.officium.application.DocTemplates;
import com.javadaba.contexts.officium.application.DocTreeService;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocImportCode;
import com.javadaba.contexts.officium.domain.DocSearchQuery;
import com.javadaba.contexts.officium.domain.OfficiumException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

/** {@code /officium/v1/projects/{projectId}/docs} (contract §8.7). A page's path keeps its slashes in
 *  the URL: {@code …/docs/procedures/deploy}. */
@Path("/officium/v1/projects/{projectId}/docs")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumDocResource {

    private final DocService docs;
    private final DocSearchService search;
    private final DocLifecycleService lifecycle;
    private final DocTreeService tree;
    private final DocImportService imports;
    private final DocPresenceService presence;
    private final DocMoveService moves;
    private final DocStarService navigation;
    private final DocRoomService rooms;
    private final AccountSessionCodec codec;

    public OfficiumDocResource(DocService docs, DocSearchService search, DocLifecycleService lifecycle,
            DocTreeService tree, DocImportService imports, DocPresenceService presence, DocMoveService moves,
            DocStarService navigation, DocRoomService rooms, AccountSessionCodec codec) {
        this.docs = docs;
        this.search = search;
        this.lifecycle = lifecycle;
        this.tree = tree;
        this.imports = imports;
        this.moves = moves;
        this.presence = presence;
        this.navigation = navigation;
        this.rooms = rooms;
        this.codec = codec;
    }

    /**
     * Every page in the tree, or with {@code q} a ranked full-text search (JAVA-800): Outline's operators,
     * the filters {@code collection}, {@code author}, {@code updatedAfter}, {@code updatedBefore},
     * {@code state}, {@code limit} and {@code offset}, and a {@code snippet} on each result. Without
     * {@code q}, {@code state} swaps the tree for
     * one of the lifecycle lists (JAVA-793): {@code unpublished} (your own drafts), {@code archived} or
     * {@code trash} (editors and owners).
     */
    @GET
    public List<?> list(@CookieParam(OfficiumSession.COOKIE) String session,
            @HeaderParam(HttpHeaders.AUTHORIZATION) String authorization,
            @PathParam("projectId") UUID projectId, @QueryParam("q") String query,
            @QueryParam("state") String state, @QueryParam("collection") String collection,
            @QueryParam("author") String author, @QueryParam("updatedAfter") String updatedAfter,
            @QueryParam("updatedBefore") String updatedBefore, @QueryParam("limit") Integer limit,
            @QueryParam("offset") Integer offset) {
        UUID accountId = reader(session, authorization, projectId);
        if (query != null && !query.isBlank()) {
            return search.search(accountId, projectId, DocSearchQuery.of(query, collection, author, updatedAfter,
                    updatedBefore, state, limit, offset));
        }
        if (state != null && !state.isBlank()) {
            return switch (state) {
                case "unpublished" -> lifecycle.unpublished(accountId, projectId);
                case "archived" -> lifecycle.archived(accountId, projectId);
                case "trash" -> lifecycle.trash(accountId, projectId);
                default -> throw OfficiumException.badRequest("invalid_doc_state",
                        "`state` is one of unpublished, archived or trash");
            };
        }
        return docs.list(accountId, projectId);
    }

    @GET
    @Path("/{path: .+}")
    public DocPageView get(@CookieParam(OfficiumSession.COOKIE) String session,
            @HeaderParam(HttpHeaders.AUTHORIZATION) String authorization,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path) {
        return docs.get(reader(session, authorization, projectId), projectId, path);
    }

    /**
     * Who reads: the session, or (with no session) a bulk import's code for this project, so the
     * import script can check every page it wrote byte for byte (JAVA-778, contract §8.13). Reads
     * only: every write here still needs the session.
     */
    private UUID reader(String session, String authorization, UUID projectId) {
        String bearer = OfficiumDocImportResource.bearer(authorization);
        if ((session == null || session.isBlank()) && bearer != null && bearer.startsWith(DocImportCode.PREFIX)) {
            return imports.authorize(bearer, projectId);
        }
        return OfficiumSession.require(codec, session).accountId();
    }

    @PUT
    @Path("/{path: .+}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response upsert(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path, UpsertRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        UpsertRequest body = request == null
                ? new UpsertRequest(null, null, null, null, null, null, null, null)
                : request;
        List<Actor> coAuthors = rooms.coAuthors(projectId, body.editSession());
        DocService.Upserted result = docs.upsert(account.accountId(), projectId, path, body.title(), body.body(),
                body.expectedVersion(), body.draft(), body.editSession(),
                new DocTemplates.Request(body.template(), body.fromTemplate(), body.timeZone()),
                OfficiumSession.actorOf(account), coAuthors);
        rooms.saved(projectId, body.editSession());
        return Response.status(result.created() ? Response.Status.CREATED : Response.Status.OK)
                .entity(result.linted()).build();
    }

    @POST
    @Path("/{path: .+}:publish")
    public DocPageView publish(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path) {
        AccountSession account = OfficiumSession.require(codec, session);
        return lifecycle.publish(account.accountId(), projectId, path, OfficiumSession.actorOf(account));
    }

    @POST
    @Path("/{path: .+}:archive")
    public DocPageView archive(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path) {
        AccountSession account = OfficiumSession.require(codec, session);
        return lifecycle.archive(account.accountId(), projectId, path, OfficiumSession.actorOf(account));
    }

    @POST
    @Path("/{path: .+}:unarchive")
    public DocPageView unarchive(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path) {
        AccountSession account = OfficiumSession.require(codec, session);
        return lifecycle.unarchive(account.accountId(), projectId, path, OfficiumSession.actorOf(account));
    }

    @DELETE
    @Path("/{path: .+}")
    public Response delete(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path,
            @QueryParam("expectedVersion") int expectedVersion) {
        AccountSession account = OfficiumSession.require(codec, session);
        docs.delete(account.accountId(), projectId, path, expectedVersion, OfficiumSession.actorOf(account));
        return Response.noContent().build();
    }

    /** One node's layout (JAVA-791, contract §8.17): 201 when the path became a collection with this write. */
    @PATCH
    @Path("/{path: .+}:node")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response updateNode(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path, NodeRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        NodeRequest body = request == null ? new NodeRequest(null, null, null, null, null, null) : request;
        DocTreeService.Updated result = tree.updateNode(account.accountId(), projectId, path, body.icon(),
                body.iconColor(), body.sortMode(), body.position(), body.fullWidth(), body.expectedVersion(),
                OfficiumSession.actorOf(account));
        return Response.status(result.created() ? Response.Status.CREATED : Response.Status.OK)
                .entity(result.node()).build();
    }

    @DELETE
    @Path("/{path: .+}:node")
    public Response deleteNode(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path,
            @QueryParam("expectedVersion") int expectedVersion) {
        AccountSession account = OfficiumSession.require(codec, session);
        tree.deleteNode(account.accountId(), projectId, path, expectedVersion, OfficiumSession.actorOf(account));
        return Response.noContent().build();
    }

    /** Moves or renames a page or folder with everything under it (JAVA-792, contract §8.20). */
    @POST
    @Path("/{path: .+}:move")
    @Consumes(MediaType.APPLICATION_JSON)
    public DocMoveService.Moved move(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path, MoveRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        MoveRequest body = request == null ? new MoveRequest(null, null, null) : request;
        return moves.move(account.accountId(), projectId, path, body.to(), body.position(), body.expectedVersion(),
                OfficiumSession.actorOf(account));
    }

    /** A copy of the page at a new path: a create, so 201. */
    @POST
    @Path("/{path: .+}:duplicate")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response duplicate(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path, DuplicateRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        DuplicateRequest body = request == null ? new DuplicateRequest(null, null) : request;
        DocService.Upserted copy = moves.duplicate(account.accountId(), projectId, path, body.to(), body.title(),
                OfficiumSession.actorOf(account));
        return Response.status(Response.Status.CREATED).entity(copy.linted()).build();
    }

    @GET
    @Path("/{path: .+}:backlinks")
    public DocMoveService.Backlinks backlinks(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path) {
        return moves.backlinks(OfficiumSession.require(codec, session).accountId(), projectId, path);
    }

    public record MoveRequest(String to, Integer position, Integer expectedVersion) {
    }

    public record DuplicateRequest(String to, String title) {
    }

    /** Who is on a page (JAVA-802, contract §8.19). */
    @GET
    @Path("/{path: .+}:presence")
    public DocPresenceService.DocPresence presence(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path) {
        return presence.get(OfficiumSession.require(codec, session).accountId(), projectId, path);
    }

    /** A person's open page beats here: web only, there is no MCP twin (an agent is never present). */
    @POST
    @Path("/{path: .+}:presence")
    @Consumes(MediaType.APPLICATION_JSON)
    public DocPresenceService.DocPresence beat(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path, PresenceRequest request) {
        PresenceRequest body = request == null ? new PresenceRequest(null, null) : request;
        return presence.beat(OfficiumSession.require(codec, session).accountId(), projectId, path, body.client(),
                body.state());
    }

    @DELETE
    @Path("/{path: .+}:presence")
    public Response leave(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path,
            @QueryParam("client") String client) {
        presence.leave(OfficiumSession.require(codec, session).accountId(), projectId, path, client);
        return Response.noContent().build();
    }

    /** 201 when this write made the star, 200 when it only moved it or found it already there (§8.20). */
    @POST
    @Path("/{path: .+}:star")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response star(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path, StarRequest request) {
        StarRequest body = request == null ? new StarRequest(null, null) : request;
        DocStarService.Starred result = navigation.star(OfficiumSession.require(codec, session).accountId(),
                projectId, path, body.kind(), body.position());
        return Response.status(result.created() ? Response.Status.CREATED : Response.Status.OK)
                .entity(result.star()).build();
    }

    @DELETE
    @Path("/{path: .+}:star")
    public Response unstar(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path,
            @QueryParam("kind") String kind) {
        navigation.unstar(OfficiumSession.require(codec, session).accountId(), projectId, path, kind);
        return Response.noContent().build();
    }

    /** The web records that the person opened the page; reading through {@code docs.get} never does. */
    @POST
    @Path("/{path: .+}:view")
    public Response view(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path) {
        navigation.view(OfficiumSession.require(codec, session).accountId(), projectId, path);
        return Response.noContent().build();
    }

    public record StarRequest(String kind, Integer position) {
    }

    public record PresenceRequest(String client, String state) {
    }

    public record NodeRequest(String icon, String iconColor, String sortMode, Integer position,
            Boolean fullWidth, Integer expectedVersion) {
    }

    /** {@code editSession}: the autosaves of one editing session keep one version (JAVA-796). {@code template},
     *  {@code fromTemplate} and {@code timeZone}: make a template, or a page from one (JAVA-801). */
    public record UpsertRequest(String title, String body, Integer expectedVersion, Boolean draft, String editSession,
            Boolean template, String fromTemplate, String timeZone) {
    }
}
