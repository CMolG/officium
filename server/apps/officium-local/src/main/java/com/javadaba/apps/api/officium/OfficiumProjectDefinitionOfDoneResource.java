package com.javadaba.apps.api.officium;

import com.javadaba.contexts.officium.application.ProjectService;
import com.javadaba.contexts.officium.application.ProjectView;
import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.List;
import java.util.UUID;

/**
 * {@code /officium/v1/projects/{id}/definition-of-done} (JAVA-1446): the project's standing Definition of Done, which
 * every agent's finishing comment answers item by item. A separate resource, like {@code docs:comments}, so the
 * project routes stay as they were; the owner's call, as the form languages are.
 */
@Path("/officium/v1/projects/{id}/definition-of-done")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumProjectDefinitionOfDoneResource {

    private final ProjectService projects;
    private final AccountSessionCodec codec;

    public OfficiumProjectDefinitionOfDoneResource(ProjectService projects, AccountSessionCodec codec) {
        this.projects = projects;
        this.codec = codec;
    }

    /** Replaces the checklist; [] removes it. Owner only, with {@code expectedVersion} as on the other project writes. */
    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    public ProjectView set(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("id") UUID id,
            DefinitionOfDoneRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return projects.setDefinitionOfDone(account.accountId(), id, request.expectedVersion(),
                request.definitionOfDone(), OfficiumSession.actorOf(account));
    }

    public record DefinitionOfDoneRequest(int expectedVersion, List<String> definitionOfDone) {
    }
}
