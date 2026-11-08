package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.DocLifecycleService;
import com.javadaba.contexts.officium.application.DocPageView;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * {@code /officium/v1/projects/{projectId}/docs:trash/{id}} (JAVA-793, contract §8.7): a trashed page is
 * addressed by its id, since one path can hold a live page and several trashed ones. A separate resource
 * like {@code docs:import}, because the page routes' {@code /docs/{path}} would swallow it as a path.
 */
@Path("/officium/v1/projects/{projectId}/docs:trash")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumDocTrashResource {

    private final DocLifecycleService lifecycle;
    private final AccountSessionCodec codec;

    public OfficiumDocTrashResource(DocLifecycleService lifecycle, AccountSessionCodec codec) {
        this.lifecycle = lifecycle;
        this.codec = codec;
    }

    @POST
    @Path("/{id}:restore")
    public DocPageView restore(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("id") UUID id) {
        AccountSession account = OfficiumSession.require(codec, session);
        return lifecycle.restore(account.accountId(), projectId, id, OfficiumSession.actorOf(account));
    }

    /** Deletes the trashed page for good; the page stays in the trash for 30 days when this is never called. */
    @DELETE
    @Path("/{id}")
    public Response purge(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("id") UUID id) {
        AccountSession account = OfficiumSession.require(codec, session);
        lifecycle.purge(account.accountId(), projectId, id, OfficiumSession.actorOf(account));
        return Response.noContent().build();
    }
}
