package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.backlog.BacklogArchive;
import com.javadaba.contexts.officium.application.backlog.BacklogImportExportService;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * {@code /officium/v1/projects/{projectId}/export/backlog.zip} (JAVA-1657): the whole backlog as one
 * {@code .zip} of {@code <CARD-KEY>.md} files, the menu's "Export backlog". Its own resource so the
 * JSON route in {@link OfficiumProjectResource} keeps its shape byte for byte.
 */
@Path("/officium/v1/projects/{projectId}/export")
@Produces({MediaType.APPLICATION_JSON, "application/zip"})
public class OfficiumBacklogExportResource {

    private final BacklogImportExportService backlog;
    private final AccountSessionCodec codec;

    public OfficiumBacklogExportResource(BacklogImportExportService backlog, AccountSessionCodec codec) {
        this.backlog = backlog;
        this.codec = codec;
    }

    @GET
    @Path("/backlog.zip")
    public Response zip(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        // The service guards at VIEWER before it names the file, so a stranger gets 404 first.
        BacklogArchive archive = backlog.exportArchive(accountId, projectId);
        return Response.ok(archive.bytes(), "application/zip")
                .header("Content-Disposition", "attachment; filename=\"" + archive.filename() + "\"")
                .header("Cache-Control", "private, no-store")
                .build();
    }
}
