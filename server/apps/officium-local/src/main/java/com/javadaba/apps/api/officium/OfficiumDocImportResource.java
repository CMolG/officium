package com.javadaba.apps.api.officium;

import com.javadaba.contexts.officium.application.DocImportService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
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
 * {@code /officium/v1/projects/{projectId}/docs:import} (contract §8.13): a bulk documentation import
 * with the one-time code the MCP minted ({@code docs.importCode}). No session: the code IS the
 * credential, and it reaches this project's documentation only.
 *
 * <p>The router matches the path as sent: a client that percent-encodes the colon ({@code %3A}, as
 * RestAssured does by default) gets a 404. curl and fetch send it as is.
 */
@Path("/officium/v1/projects/{projectId}/docs:import")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumDocImportResource {

    private final DocImportService imports;

    public OfficiumDocImportResource(DocImportService imports) {
        this.imports = imports;
    }

    /** A batch of pages, each answered on its own: 200 even when some are rejected. */
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public DocImportService.ImportResult importPages(@HeaderParam(HttpHeaders.AUTHORIZATION) String authorization,
            @PathParam("projectId") UUID projectId, ImportRequest request) {
        return imports.importPages(bearer(authorization), projectId, request == null ? null : request.pages());
    }

    /** Ends the import: the code stops working, for writing and for reading back. */
    @DELETE
    public Response close(@HeaderParam(HttpHeaders.AUTHORIZATION) String authorization,
            @PathParam("projectId") UUID projectId) {
        imports.close(bearer(authorization), projectId);
        return Response.noContent().build();
    }

    /** The token after {@code Bearer }, or null; the service answers 401 for anything but a live code. */
    static String bearer(String authorization) {
        String prefix = "Bearer ";
        return authorization != null && authorization.regionMatches(true, 0, prefix, 0, prefix.length())
                ? authorization.substring(prefix.length()).strip()
                : null;
    }

    public record ImportRequest(List<DocImportService.PageInput> pages) {
    }
}
