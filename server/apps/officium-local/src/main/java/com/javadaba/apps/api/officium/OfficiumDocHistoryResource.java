package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.DocHistoryService;
import com.javadaba.contexts.officium.application.DocService;
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
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * A page's history and the project's history window (JAVA-794, contract §8.x). The verbs are colon
 * prefixes on the page's path, like {@code docs:import}: {@code …/docs:history/procedures/deploy}. A suffix
 * (`…/docs/{path}:history`) loses to the greedy page route, which reads it as a bad page path.
 */
@Path("/officium/v1/projects/{projectId}")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumDocHistoryResource {

    private final DocHistoryService history;
    private final AccountSessionCodec codec;

    public OfficiumDocHistoryResource(DocHistoryService history, AccountSessionCodec codec) {
        this.history = history;
        this.codec = codec;
    }

    @GET
    @Path("/docs:history/{path: .+}")
    public DocHistoryService.HistoryView history(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path) {
        return history.history(OfficiumSession.require(codec, session).accountId(), projectId, path);
    }

    @POST
    @Path("/docs:restore/{path: .+}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response restore(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path, RestoreRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        RestoreRequest body = request == null ? new RestoreRequest(null, null) : request;
        DocService.Upserted result = history.restore(account.accountId(), projectId, path, body.revisionId(),
                body.expectedVersion(), OfficiumSession.actorOf(account));
        return Response.ok(result.linted()).build();
    }

    @DELETE
    @Path("/docs:history/{path: .+}")
    public Response deleteRevision(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("path") String path,
            @QueryParam("revisionId") UUID revisionId, @QueryParam("confirm") String confirm) {
        AccountSession account = OfficiumSession.require(codec, session);
        history.deleteRevision(account.accountId(), projectId, path, revisionId, confirm,
                OfficiumSession.actorOf(account));
        return Response.noContent().build();
    }

    @GET
    @Path("/docs:settings")
    public DocHistoryService.SettingsView settings(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        return history.settings(OfficiumSession.require(codec, session).accountId(), projectId);
    }

    @PATCH
    @Path("/docs:settings")
    @Consumes(MediaType.APPLICATION_JSON)
    public DocHistoryService.SettingsView updateSettings(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, SettingsRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        SettingsRequest body = request == null ? new SettingsRequest(null, null) : request;
        return history.updateSettings(account.accountId(), projectId, body.historyDays(), body.expectedVersion(),
                OfficiumSession.actorOf(account));
    }

    public record RestoreRequest(UUID revisionId, Integer expectedVersion) {
    }

    public record SettingsRequest(Integer historyDays, Integer expectedVersion) {
    }
}
