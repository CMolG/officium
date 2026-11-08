package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.CardView;
import com.javadaba.contexts.officium.application.CardWorkflowService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.Map;
import java.util.UUID;

/** {@code PUT /officium/v1/projects/{projectId}/cards/{cardId}/workflow} (card://JAVA-1591): a card's own workflow. */
@Path("/officium/v1/projects/{projectId}/cards/{cardId}/workflow")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class OfficiumCardWorkflowResource {

    private final CardWorkflowService workflows;
    private final AccountSessionCodec codec;

    public OfficiumCardWorkflowResource(CardWorkflowService workflows, AccountSessionCodec codec) {
        this.workflows = workflows;
        this.codec = codec;
    }

    @PUT
    public CardView set(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("cardId") UUID cardId, WorkflowRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return workflows.set(account.accountId(), projectId, cardId, request.expectedVersion(), request.workflow(),
                OfficiumSession.actorOf(account));
    }

    /** {@code workflow} is the document as written; null clears the card's own workflow. */
    public record WorkflowRequest(int expectedVersion, Map<String, Object> workflow) {
    }
}
