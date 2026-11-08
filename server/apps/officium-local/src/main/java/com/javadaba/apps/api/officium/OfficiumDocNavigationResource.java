package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.DocRecentView;
import com.javadaba.contexts.officium.application.DocStarService;
import com.javadaba.contexts.officium.application.DocStarView;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import java.util.List;
import java.util.UUID;

/**
 * A person's own way through the documentation (JAVA-799, contract §8.21): the stars and the recently
 * opened pages. Everything here is the caller's alone; any member has it, a viewer included.
 *
 * <p>The per-page writes ({@code POST}/{@code DELETE …/docs/{path}:star}, {@code POST …:view}) are
 * routes of {@link OfficiumDocResource}, which owns the {@code /docs/{path}} space; they call the same
 * service. Like {@code docs:tree}, the router matches the path as sent: a percent-encoded colon is a 404.
 */
@Path("/officium/v1/projects/{projectId}")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumDocNavigationResource {

    private final DocStarService navigation;
    private final AccountSessionCodec codec;

    public OfficiumDocNavigationResource(DocStarService navigation, AccountSessionCodec codec) {
        this.navigation = navigation;
        this.codec = codec;
    }

    @GET
    @Path("/docs:starred")
    public List<DocStarView> starred(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        return navigation.starred(OfficiumSession.require(codec, session).accountId(), projectId);
    }

    @GET
    @Path("/docs:recent")
    public List<DocRecentView> recent(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @QueryParam("limit") Integer limit) {
        return navigation.recent(OfficiumSession.require(codec, session).accountId(), projectId, limit);
    }

}
