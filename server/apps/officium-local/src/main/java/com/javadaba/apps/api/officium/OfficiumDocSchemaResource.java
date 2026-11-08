package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.DocSchema;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.UUID;

/**
 * {@code /officium/v1/docs} (contract §8.14): the documentation page schema and its lint, the REST
 * twins of {@code docs.schema} and {@code docs.lint}. Project-independent: the schema is part of
 * the contract, not a page of any project.
 */
@Path("/officium/v1/docs")
public class OfficiumDocSchemaResource {

    private final DocSchema schema;
    private final AccountSessionCodec codec;

    public OfficiumDocSchemaResource(DocSchema schema, AccountSessionCodec codec) {
        this.schema = schema;
        this.codec = codec;
    }

    /** The schema as Markdown. No session, like {@code /officium/v1/meta}: it is the contract. */
    @GET
    @Path("/schema")
    @Produces("text/markdown; charset=UTF-8")
    public String schema() {
        return schema.schema().markdown();
    }

    /** A {@code body} as sent, or the page at {@code projectId} + {@code path} the session can read. */
    @POST
    @Path("/lint")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public DocSchema.Lint lint(@CookieParam(OfficiumSession.COOKIE) String session, LintRequest request) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        LintRequest body = request == null ? new LintRequest(null, null, null) : request;
        return schema.lint(accountId, body.projectId(), body.path(), body.body());
    }

    public record LintRequest(UUID projectId, String path, String body) {
    }
}
