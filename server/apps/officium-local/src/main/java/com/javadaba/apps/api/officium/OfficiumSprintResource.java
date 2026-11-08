package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.SprintService;
import com.javadaba.contexts.officium.application.SprintView;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.SprintState;
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

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

/** {@code /officium/v1/projects/{projectId}/sprints} (contract §8.2). */
@Path("/officium/v1/projects/{projectId}/sprints")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumSprintResource {

    private final SprintService sprints;
    private final AccountSessionCodec codec;

    public OfficiumSprintResource(SprintService sprints, AccountSessionCodec codec) {
        this.sprints = sprints;
        this.codec = codec;
    }

    @GET
    public List<SprintView> list(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @QueryParam("state") String state) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        SprintState filter;
        try {
            filter = state == null || state.isBlank() ? null : SprintState.fromWire(state);
        } catch (IllegalArgumentException ex) {
            throw OfficiumException.badRequest("invalid_state", "state is planned, active or closed");
        }
        return sprints.list(accountId, projectId, filter);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, CreateRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        CreateRequest body = request == null ? new CreateRequest(null, null, null, null) : request;
        SprintView created = sprints.create(account.accountId(), projectId, body.name(), body.goal(),
                date(body.startDate(), "startDate"), date(body.endDate(), "endDate"), OfficiumSession.actorOf(account));
        return Response.status(Response.Status.CREATED).entity(created).build();
    }

    @PATCH
    @Path("/{sprintId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public SprintView update(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("sprintId") UUID sprintId, UpdateRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return sprints.update(account.accountId(), projectId, sprintId, request.expectedVersion(), request.name(),
                request.goal(), date(request.startDate(), "startDate"), date(request.endDate(), "endDate"),
                request.order(), OfficiumSession.actorOf(account));
    }

    @POST
    @Path("/{sprintId}/start")
    @Consumes(MediaType.APPLICATION_JSON)
    public SprintView start(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("sprintId") UUID sprintId, StartRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return sprints.start(account.accountId(), projectId, sprintId, request.expectedVersion(),
                date(request.startDate(), "startDate"), date(request.endDate(), "endDate"),
                OfficiumSession.actorOf(account));
    }

    @POST
    @Path("/{sprintId}/complete")
    @Consumes(MediaType.APPLICATION_JSON)
    public SprintService.CompletedSprint complete(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("sprintId") UUID sprintId, CompleteRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return sprints.complete(account.accountId(), projectId, sprintId, request.expectedVersion(),
                request.moveOpenCardsTo(), OfficiumSession.actorOf(account));
    }

    @DELETE
    @Path("/{sprintId}")
    public Response delete(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("sprintId") UUID sprintId,
            @QueryParam("expectedVersion") int expectedVersion) {
        AccountSession account = OfficiumSession.require(codec, session);
        sprints.delete(account.accountId(), projectId, sprintId, expectedVersion, OfficiumSession.actorOf(account));
        return Response.noContent().build();
    }

    private static LocalDate date(String raw, String field) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(raw);
        } catch (DateTimeParseException ex) {
            throw OfficiumException.badRequest("invalid_" + field, field + " must be yyyy-mm-dd");
        }
    }

    public record CreateRequest(String name, String goal, String startDate, String endDate) {
    }

    public record UpdateRequest(int expectedVersion, String name, String goal, String startDate, String endDate,
            Integer order) {
    }

    public record StartRequest(int expectedVersion, String startDate, String endDate) {
    }

    public record CompleteRequest(int expectedVersion, String moveOpenCardsTo) {
    }
}
