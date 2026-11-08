package com.javadaba.apps.api.officium;

import com.javadaba.contexts.officium.application.CardRequestService;
import io.smallrye.common.annotation.Blocking;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.CompletionStage;

/**
 * JAVA-1122: an agent's harness waiting on the answer to its request, with the account's heartbeat
 * token, like the session waiter ({@link OfficiumAgentWindowResource}): a harness script holds the
 * token, never the model, and the long-poll is answered asynchronously, holding no worker thread.
 */
@Path("/officium/v1/requests")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumRequestWaitResource {

    private static final String BEARER = "Bearer ";

    private final CardRequestService requests;

    public OfficiumRequestWaitResource(CardRequestService requests) {
        this.requests = requests;
    }

    /** {@code 200} with the request once it is no longer open; {@code 204} when nothing changed within
     *  {@code wait} seconds (capped at {@link CardRequestService#MAX_WAIT}). */
    @GET
    @Path("/{requestId}/wait")
    @Blocking
    public CompletionStage<Response> waitFor(@HeaderParam(HttpHeaders.AUTHORIZATION) String authorization,
            @PathParam("requestId") UUID requestId, @QueryParam("wait") Integer waitSeconds) {
        Duration wait = Duration.ofSeconds(waitSeconds == null ? 0 : Math.max(0, waitSeconds));
        return requests.waitFor(bearer(authorization), requestId, wait)
                .thenApply(view -> view.map(found -> Response.ok(found).build())
                        .orElseGet(() -> Response.noContent().build()));
    }

    private static String bearer(String authorization) {
        return authorization != null && authorization.regionMatches(true, 0, BEARER, 0, BEARER.length())
                ? authorization.substring(BEARER.length()).strip()
                : null;
    }
}
