package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.DocTreeService;
import com.javadaba.contexts.officium.application.DocTreeView;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.UUID;

/**
 * {@code GET /officium/v1/projects/{projectId}/docs:tree} (contract §8.17): the documentation as it is
 * laid out. The node writes ({@code PATCH}/{@code DELETE …/docs/{path}:node}) live on
 * {@link OfficiumDocResource}, which owns the {@code /docs/{path}} space.
 *
 * <p>Like {@code docs:import}, the router matches the path as sent: a client that percent-encodes the
 * colon gets a 404.
 */
@Path("/officium/v1/projects/{projectId}/docs:tree")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumDocTreeResource {

    private final DocTreeService tree;
    private final AccountSessionCodec codec;

    public OfficiumDocTreeResource(DocTreeService tree, AccountSessionCodec codec) {
        this.tree = tree;
        this.codec = codec;
    }

    @GET
    public DocTreeView get(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        return tree.tree(OfficiumSession.require(codec, session).accountId(), projectId);
    }
}
