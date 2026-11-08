package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.apps.api.account.SignInBound;
import com.javadaba.contexts.officium.application.HeartbeatService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

/**
 * {@code /officium/v1/heartbeat} (JAVA-186, contract §4.2): the harness keeping its agent's card
 * alive with its machine's heartbeat token, and the account managing those devices from the web
 * (JAVA-675).
 *
 * <p>Only {@code /tokens/redeem} is anonymous, and it is in {@code IpRateLimitFilter}, like Fluxor's
 * enrollments: a real machine redeems once, so the limit only ever stops someone trying codes. The
 * beat is not: it is authenticated, and one beat every few seconds from several agents behind one
 * address would trip a per-IP anti-abuse limit with nothing abusive going on.
 *
 * <p>A token or code asked for from the native app is that sign-in's and ends with it, and so does
 * the token its code is redeemed into (JAVA-1425, {@link SignInBound}).
 */
@Path("/officium/v1/heartbeat")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumHeartbeatResource {

    private static final String BEARER = "Bearer ";

    private final HeartbeatService heartbeat;
    private final AccountSessionCodec codec;
    private final SignInBound signIn;

    public OfficiumHeartbeatResource(HeartbeatService heartbeat, AccountSessionCodec codec, SignInBound signIn) {
        this.heartbeat = heartbeat;
        this.codec = codec;
        this.signIn = signIn;
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public BeatResult beat(@HeaderParam(HttpHeaders.AUTHORIZATION) String authorization, BeatRequest request) {
        String token = authorization != null && authorization.regionMatches(true, 0, BEARER, 0, BEARER.length())
                ? authorization.substring(BEARER.length()).strip()
                : null;
        BeatRequest body = request == null ? new BeatRequest(null, null, null, null) : request;
        return new BeatResult(heartbeat.beat(token, body.machine(), body.text(), body.model(), body.effort()));
    }

    @GET
    @Path("/tokens")
    public List<HeartbeatService.Device> devices(@CookieParam(OfficiumSession.COOKIE) String session) {
        return heartbeat.devices(OfficiumSession.require(codec, session).accountId());
    }

    /** A token for a new device of the signed-in account; the others keep working. Its only appearance. */
    @POST
    @Path("/tokens")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response issue(@CookieParam(OfficiumSession.COOKIE) String session, DeviceRequest request) {
        String machine = request == null ? null : request.machine();
        UUID family = signIn.family();
        HeartbeatService.IssuedToken issued = heartbeat.issue(OfficiumSession.require(codec, session).accountId(),
                machine, family);
        signIn.confirm(family);
        return Response.status(Response.Status.CREATED).entity(issued).header("Cache-Control", "no-store").build();
    }

    @DELETE
    @Path("/tokens/{id}")
    public Response revoke(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("id") String id) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        heartbeat.revoke(accountId, uuidOrNull(id));
        return Response.noContent().build();
    }

    /** The MCP's {@code heartbeat.setup}, for the signed-in account: a one-time code inside the command
     *  that trades it for this machine's token. */
    @POST
    @Path("/setup")
    public Response setup(@CookieParam(OfficiumSession.COOKIE) String session) {
        UUID family = signIn.family();
        HeartbeatService.Setup setup = heartbeat.setup(OfficiumSession.require(codec, session).accountId(), family);
        signIn.confirm(family);
        return Response.ok(setup).header("Cache-Control", "no-store").build();
    }

    /** The setup command's call: the bare token, so curl writes it to the file and nothing prints it. */
    @POST
    @Path("/tokens/redeem")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.TEXT_PLAIN)
    public Response redeemToFile(RedeemRequest request) {
        HeartbeatService.IssuedToken issued = redeem(request);
        return Response.status(Response.Status.CREATED).entity(issued.token()).type(MediaType.TEXT_PLAIN_TYPE)
                .header("Cache-Control", "no-store").build();
    }

    @POST
    @Path("/tokens/redeem")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response redeemAsJson(RedeemRequest request) {
        return Response.status(Response.Status.CREATED).entity(redeem(request))
                .header("Cache-Control", "no-store").build();
    }

    private HeartbeatService.IssuedToken redeem(RedeemRequest request) {
        RedeemRequest body = request == null ? new RedeemRequest(null, null) : request;
        HeartbeatService.Redeemed redeemed = heartbeat.redeem(body.code(), body.machine());
        signIn.confirm(redeemed.signInFamily());
        return redeemed.token();
    }

    /** A malformed id is simply nobody's device: the same 404 as another account's. */
    private static UUID uuidOrNull(String id) {
        try {
            return UUID.fromString(id);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    /** {@code model} and {@code effort} are optional (JAVA-584): what the agent runs on, shown on its card. */
    public record BeatRequest(String machine, String text, String model, String effort) {
    }

    /** The cards the beat kept alive: empty when that machine's agent is working none. */
    public record BeatResult(List<String> cards) {
    }

    public record DeviceRequest(String machine) {
    }

    public record RedeemRequest(String code, String machine) {
    }
}
