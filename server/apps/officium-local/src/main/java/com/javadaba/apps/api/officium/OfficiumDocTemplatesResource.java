package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.DocService;
import com.javadaba.contexts.officium.application.DocTemplateView;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.List;
import java.util.UUID;

/**
 * {@code GET /officium/v1/projects/{projectId}/docs:templates} (JAVA-801, contract §8.23): the project's
 * templates, each with the collection it belongs to. A template is made and used through the page
 * write ({@code PUT …/docs/{path}} with {@code template} or {@code fromTemplate}), which
 * {@link OfficiumDocResource} owns.
 *
 * <p>Like {@code docs:tree}, the router matches the path as sent: a percent-encoded colon is a 404.
 */
@Path("/officium/v1/projects/{projectId}/docs:templates")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumDocTemplatesResource {

    private final DocService docs;
    private final AccountSessionCodec codec;

    public OfficiumDocTemplatesResource(DocService docs, AccountSessionCodec codec) {
        this.docs = docs;
        this.codec = codec;
    }

    @GET
    public List<DocTemplateView> list(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        return docs.templates(OfficiumSession.require(codec, session).accountId(), projectId);
    }
}
