package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.AutoloopService;
import com.javadaba.contexts.officium.application.HeartbeatService;
import com.javadaba.contexts.officium.application.NextRunService;
import com.javadaba.contexts.officium.application.PhasedPick;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * The autoloop's remote switch on a project (card://JAVA-1528): the supervisor beats with its machine's heartbeat
 * token, the board reads the state and queues {@code start} or {@code stop} with the person's session. The REST
 * twins of {@code autoloop.heartbeat}, {@code autoloop.status}, {@code autoloop.start} and {@code autoloop.stop}.
 */
@Path("/officium/v1/projects/{projectId}/autoloop")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumAutoloopResource {

    private static final String BEARER = "Bearer ";

    private final AutoloopService autoloops;
    private final HeartbeatService heartbeat;
    private final AccountSessionCodec codec;
    private final NextRunService nextRuns;

    public OfficiumAutoloopResource(AutoloopService autoloops, HeartbeatService heartbeat, AccountSessionCodec codec,
            NextRunService nextRuns) {
        this.autoloops = autoloops;
        this.heartbeat = heartbeat;
        this.codec = codec;
        this.nextRuns = nextRuns;
    }

    @GET
    public AutoloopService.StatusView status(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        return autoloops.status(OfficiumSession.require(codec, session).accountId(), projectId);
    }

    /** {@code {"machine", "state", "slots"?, "target"?}} with the heartbeat token: answers {@code {command}}. */
    @POST
    @Path("/heartbeat")
    @Consumes(MediaType.APPLICATION_JSON)
    public AutoloopService.Order heartbeat(@HeaderParam(HttpHeaders.AUTHORIZATION) String authorization,
            @PathParam("projectId") UUID projectId, Beat beat) {
        UUID accountId = accountOf(authorization);
        Beat body = beat == null ? new Beat(null, null, null, null) : beat;
        return autoloops.heartbeat(accountId, projectId, body.machine(), body.state(), body.slots(), body.target(),
                Actor.agent(accountId, "Autoloop", body.machine()));
    }

    /**
     * The model and effort the next card asks for (card://JAVA-1587), with the heartbeat token: the supervisor starts a
     * slot's session on them, so no session is spent only on relaunching itself onto another model. All null when
     * nothing is eligible. {@code card} asks for that card's run instead, the card a slot holds (JAVA-1786);
     * {@code exclude} leaves out the comma-separated keys other slots of the machine hold; {@code phases} is the loop's
     * {@code --phases}, so a review-only loop is never started on a card it cannot take (card://JAVA-1890);
     * {@code machine} is the slot's, whose stale sessions end and whose own unfinished unit comes first (JAVA-2004).
     */
    @GET
    @Path("/next-run")
    public NextRunService.NextRun nextRun(@HeaderParam(HttpHeaders.AUTHORIZATION) String authorization,
            @PathParam("projectId") UUID projectId, @QueryParam("card") String card,
            @QueryParam("exclude") String exclude, @QueryParam("phases") String phases,
            @QueryParam("machine") String machine) {
        return nextRuns.next(accountOf(authorization), projectId, machine, card, keysOf(exclude),
                PhasedPick.parse(keysOf(phases)));
    }

    /**
     * The done gate (card://JAVA-2004), with the heartbeat token: whether the unit of the card a slot holds still has
     * work a session can do now. The loop's {@code done} is refused while it does.
     */
    @GET
    @Path("/unit")
    public NextRunService.UnitState unit(@HeaderParam(HttpHeaders.AUTHORIZATION) String authorization,
            @PathParam("projectId") UUID projectId, @QueryParam("card") String card) {
        UUID accountId = accountOf(authorization);
        if (card == null || card.isBlank()) {
            throw OfficiumException.badRequest("card_required", "Say which card: ?card=KEY");
        }
        return nextRuns.unitState(accountId, projectId, card);
    }

    private static List<String> keysOf(String exclude) {
        return exclude == null
                ? List.of()
                : Arrays.stream(exclude.split(",")).map(String::strip).filter(key -> !key.isEmpty()).toList();
    }

    private UUID accountOf(String authorization) {
        if (authorization == null || !authorization.regionMatches(true, 0, BEARER, 0, BEARER.length())) {
            throw new OfficiumException("invalid_token", "Call with the machine's heartbeat token", 401);
        }
        return heartbeat.accountFor(authorization.substring(BEARER.length()).strip());
    }

    @POST
    @Path("/start")
    public AutoloopService.StatusView start(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        AccountSession account = OfficiumSession.require(codec, session);
        return autoloops.start(account.accountId(), projectId, OfficiumSession.actorOf(account));
    }

    @POST
    @Path("/stop")
    public AutoloopService.StatusView stop(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        AccountSession account = OfficiumSession.require(codec, session);
        return autoloops.stop(account.accountId(), projectId, OfficiumSession.actorOf(account));
    }

    public record Beat(String machine, String state, Integer slots, String target) {
    }
}
