package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.WorkProfileService;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import java.util.UUID;

/**
 * Work profiles (card://JAVA-1524), the REST twins of {@code profiles.list}, {@code profiles.get} and {@code
 * profiles.upsert}. {@code profiles.activate} and {@code roles.get} are under the project, in
 * {@link OfficiumProjectResource}: that root resource takes every {@code /officium/v1/projects/...} path.
 */
@Path("/officium/v1/profiles")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumProfileResource {

    private final WorkProfileService profiles;
    private final AccountSessionCodec codec;

    public OfficiumProfileResource(WorkProfileService profiles, AccountSessionCodec codec) {
        this.profiles = profiles;
        this.codec = codec;
    }

    @GET
    public WorkProfileService.ProfilesView list(@CookieParam(OfficiumSession.COOKIE) String session,
            @QueryParam("projectId") UUID projectId) {
        return profiles.list(OfficiumSession.require(codec, session).accountId(), projectId);
    }

    @GET
    @Path("/{profileId}")
    public WorkProfileService.ProfileView get(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("profileId") String profileId) {
        return profiles.get(OfficiumSession.require(codec, session).accountId(), profileId);
    }

    @PUT
    @Path("/{profileId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public WorkProfileService.ProfileView upsert(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("profileId") String profileId, UpsertRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        OfficiumProjectResource.RoleMatrixOverrides overrides = request.overrides();
        return profiles.upsert(account.accountId(), profileId, new WorkProfileService.Upsert(request.name(),
                overrides == null
                        ? null
                        : RoleMatrix.fromWire(overrides.categories(), overrides.signals(), overrides.runs(),
                                overrides.mods()),
                request.expectedVersion(),
                Boolean.TRUE.equals(request.reset())));
    }

    /** {@code overrides} in projects.setRoleMatrix's shape; {@code reset} drops a built-in's copy. */
    public record UpsertRequest(int expectedVersion, String name, OfficiumProjectResource.RoleMatrixOverrides overrides,
            Boolean reset) {
    }

}
