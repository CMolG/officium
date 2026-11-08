package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.CheckpointService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.UUID;

/**
 * {@code POST /officium/v1/projects/{projectId}/cards/{cardId}/checkpoint}: the REST twin of {@code cards.setCheckpoint}
 * (card://JAVA-1876), a sweep's move between an epic's checkpoints.
 */
@Path("/officium/v1/projects/{projectId}/cards/{cardId}/checkpoint")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class OfficiumCheckpointResource {

    private final CheckpointService checkpoints;
    private final AccountSessionCodec codec;

    public OfficiumCheckpointResource(CheckpointService checkpoints, AccountSessionCodec codec) {
        this.checkpoints = checkpoints;
        this.codec = codec;
    }

    @POST
    public CheckpointService.Answer set(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("cardId") String cardId, CheckpointRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        CheckpointRequest body = request == null ? new CheckpointRequest(null, null) : request;
        return checkpoints.set(account.accountId(), projectId, cardId, body.state(), body.note(),
                OfficiumSession.actorOf(account));
    }

    /** {@code state} is {@code in_progress} or {@code completed}; {@code note} is required for the second. */
    public record CheckpointRequest(String state, String note) {
    }
}
