package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.CardRequestService;
import com.javadaba.contexts.officium.application.CardRequestService.CardRequestView;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.List;
import java.util.UUID;

/**
 * JAVA-1122: the requests an agent opened on a project's cards ("Waiting for you"). A person lists
 * and answers them with their session; the agent opens and closes them over the MCP, and its harness
 * waits on the answer at {@link OfficiumRequestWaitResource}. Its own prefix, longer than
 * {@code /officium/v1/projects}, so JAX-RS routes these paths here and not to the project resource.
 */
@Path("/officium/v1/projects/{projectId}/requests")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumCardRequestResource {

    private final CardRequestService requests;
    private final AccountSessionCodec codec;

    public OfficiumCardRequestResource(CardRequestService requests, AccountSessionCodec codec) {
        this.requests = requests;
        this.codec = codec;
    }

    /** The project's requests waiting on a person, or answered and waiting on their agent, oldest first. */
    @GET
    public List<CardRequestView> live(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        return requests.live(OfficiumSession.require(codec, session).accountId(), projectId);
    }

    /** {@code {"answer": "done"|"declined", "note"?}}: the note is plain text and never a secret. */
    @POST
    @Path("/{requestId}/answer")
    @Consumes(MediaType.APPLICATION_JSON)
    public CardRequestView answer(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("requestId") UUID requestId, AnswerRequest body) {
        AccountSession account = OfficiumSession.require(codec, session);
        AnswerRequest answer = body == null ? new AnswerRequest(null, null) : body;
        return requests.answer(account.accountId(), projectId, requestId, answer.answer(), answer.note(),
                OfficiumSession.actorOf(account));
    }

    @POST
    @Path("/{requestId}/close")
    public CardRequestView close(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("requestId") UUID requestId) {
        AccountSession account = OfficiumSession.require(codec, session);
        return requests.close(account.accountId(), projectId, requestId, OfficiumSession.actorOf(account));
    }

    public record AnswerRequest(String answer, String note) {
    }
}
