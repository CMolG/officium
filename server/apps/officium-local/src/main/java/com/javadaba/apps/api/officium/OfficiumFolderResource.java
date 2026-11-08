package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.FolderService;
import com.javadaba.contexts.officium.application.FolderView;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

/** {@code /officium/v1/folders} (contract §3). Session resource: {@code AccountSessionCodec} is
 *  cross-module-private (catalog pattern 4). */
@Path("/officium/v1/folders")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumFolderResource {

    private final FolderService folders;
    private final AccountSessionCodec codec;

    public OfficiumFolderResource(FolderService folders, AccountSessionCodec codec) {
        this.folders = folders;
        this.codec = codec;
    }

    @GET
    public List<FolderView> list(@CookieParam(OfficiumSession.COOKIE) String session) {
        AccountSession account = OfficiumSession.require(codec, session);
        return folders.list(account.accountId()).stream().map(FolderView::of).toList();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@CookieParam(OfficiumSession.COOKIE) String session, FolderRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        FolderView created = FolderView.of(folders.create(account.accountId(), request == null ? null : request.name(),
                request == null ? null : request.parentId()));
        return Response.status(Response.Status.CREATED).entity(created).build();
    }

    @PATCH
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public FolderView update(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("id") UUID id,
            FolderRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return FolderView.of(folders.update(account.accountId(), id, request == null ? null : request.name(),
                request == null ? null : request.parentId()));
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("id") UUID id) {
        AccountSession account = OfficiumSession.require(codec, session);
        folders.delete(account.accountId(), id);
        return Response.noContent().build();
    }

    public record FolderRequest(String name, UUID parentId) {
    }
}
