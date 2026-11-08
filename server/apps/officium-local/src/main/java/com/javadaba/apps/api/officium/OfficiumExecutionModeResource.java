package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.ExecutionModeSettings;
import com.javadaba.contexts.officium.domain.ExecutionMode;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.UUID;

/**
 * {@code /officium/v1/projects/{projectId}/execution-mode}: the REST twin of {@code projects.executionMode} and
 * {@code projects.setExecutionMode} (card://JAVA-1878).
 */
@Path("/officium/v1/projects/{projectId}/execution-mode")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumExecutionModeResource {

    private final ExecutionModeSettings settings;
    private final AccountSessionCodec codec;

    public OfficiumExecutionModeResource(ExecutionModeSettings settings, AccountSessionCodec codec) {
        this.settings = settings;
        this.codec = codec;
    }

    @GET
    public ExecutionModeSettings.SettingsView get(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        return settings.get(OfficiumSession.require(codec, session).accountId(), projectId);
    }

    /** Sets the mode under {@code expectedVersion}, owner only; {@code dryRun} stores nothing and answers the preview. */
    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    public ExecutionModeSettings.SetView set(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, ModeRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        ModeRequest body = request == null ? new ModeRequest(0, null, null, false) : request;
        return settings.set(account.accountId(), projectId, ExecutionMode.of(body.mode(), body.implementerRole()),
                body.expectedVersion(), body.dryRun(), OfficiumSession.actorOf(account));
    }

    public record ModeRequest(int expectedVersion, String mode, String implementerRole, boolean dryRun) {
    }
}
