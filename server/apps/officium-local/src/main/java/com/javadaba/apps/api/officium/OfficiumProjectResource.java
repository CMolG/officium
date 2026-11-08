package com.javadaba.apps.api.officium;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.ActivityService;
import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.application.CardTimeService;
import com.javadaba.contexts.officium.application.MetricsService;
import com.javadaba.contexts.officium.application.ProjectMachineService;
import com.javadaba.contexts.officium.application.ProjectService;
import com.javadaba.contexts.officium.application.ProjectView;
import com.javadaba.contexts.officium.application.RoleMatrixService;
import com.javadaba.contexts.officium.application.WorkProfileService;
import com.javadaba.contexts.officium.application.TimesheetReport;
import com.javadaba.contexts.officium.application.ActivityView;
import com.javadaba.contexts.officium.application.backlog.BacklogImportExportService;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Page;
import com.javadaba.contexts.officium.domain.ProjectFacets;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** {@code /officium/v1/projects} (contract §3). */
@Path("/officium/v1/projects")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumProjectResource {

    private final ProjectService projects;
    private final CardService cards;
    private final CardTimeService time;
    private final ActivityService activity;
    private final BacklogImportExportService backlog;
    private final ProjectMachineService machines;
    private final MetricsService metrics;
    private final RoleMatrixService roleMatrices;
    private final WorkProfileService profiles;
    private final AccountSessionCodec codec;

    public OfficiumProjectResource(ProjectService projects, CardService cards, CardTimeService time,
            ActivityService activity, BacklogImportExportService backlog, ProjectMachineService machines,
            MetricsService metrics, RoleMatrixService roleMatrices, WorkProfileService profiles,
            AccountSessionCodec codec) {
        this.profiles = profiles;
        this.projects = projects;
        this.cards = cards;
        this.time = time;
        this.activity = activity;
        this.backlog = backlog;
        this.machines = machines;
        this.metrics = metrics;
        this.roleMatrices = roleMatrices;
        this.codec = codec;
    }

    /** {@code projects.roleMatrix}'s REST twin (JAVA-294): the default matrix with the project's override. */
    @GET
    @Path("/{id}/role-matrix")
    public RoleMatrixService.RoleMatrixView roleMatrix(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("id") UUID id) {
        return roleMatrices.get(OfficiumSession.require(codec, session).accountId(), id);
    }

    /** {@code projects.setRoleMatrix}'s REST twin: replaces the override, owner only. */
    @PUT
    @Path("/{id}/role-matrix")
    @Consumes(MediaType.APPLICATION_JSON)
    public RoleMatrixService.RoleMatrixView setRoleMatrix(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("id") UUID id, RoleMatrixRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        RoleMatrixOverrides overrides = request.overrides() == null
                ? new RoleMatrixOverrides(null, null, null, null)
                : request.overrides();
        // A write naming no runs keeps the project's (JAVA-915): it comes from a client older than them.
        return roleMatrices.set(account.accountId(), id,
                RoleMatrix.fromWire(overrides.categories(), overrides.signals(), overrides.runs(), overrides.mods()),
                overrides.runs() != null, overrides.mods() != null, request.expectedVersion(),
                OfficiumSession.actorOf(account));
    }

    /** {@code profiles.activate}'s REST twin (card://JAVA-1524), owner only; a null profile goes back to defaults. */
    @PUT
    @Path("/{projectId}/work-profile")
    @Consumes(MediaType.APPLICATION_JSON)
    public WorkProfileService.ProfilesView activateProfile(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, ActivateProfileRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return profiles.activate(account.accountId(), projectId, request == null ? null : request.profileId(),
                request == null ? null : request.shuffle(), OfficiumSession.actorOf(account));
    }

    /** {@code roles.list}'s REST twin (JAVA-534): the roles of Fluxor's catalog, without their bodies. */
    @GET
    @Path("/{projectId}/roles")
    public WorkProfileService.RolesView roles(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        return profiles.roles(OfficiumSession.require(codec, session).accountId(), projectId);
    }

    /** {@code roles.get}'s REST twin (ADR 0018, card://JAVA-1524, JAVA-404): a role's sheet as the project reads it. */
    @GET
    @Path("/{projectId}/roles/{roleId}")
    public WorkProfileService.RoleView role(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("roleId") String roleId,
            @QueryParam("version") Integer version) {
        return profiles.role(OfficiumSession.require(codec, session).accountId(), projectId, roleId, version);
    }

    /** {@code mods.list}'s REST twin (card://JAVA-1569): the mods of Fluxor's catalog, without their bodies. */
    @GET
    @Path("/{projectId}/mods")
    public WorkProfileService.ModsView mods(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        return profiles.mods(OfficiumSession.require(codec, session).accountId(), projectId);
    }

    /** {@code mods.get}'s REST twin: a mod's sheet, its body in Markdown. */
    @GET
    @Path("/{projectId}/mods/{modId}")
    public WorkProfileService.ModView mod(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("modId") String modId) {
        return profiles.mod(OfficiumSession.require(codec, session).accountId(), projectId, modId);
    }

    /** Is a machine hosting this project's attachments right now (JDB-242)? Readers may ask. */
    @GET
    @Path("/{projectId}/machine")
    public ProjectMachineService.MachineView machine(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        return machines.machine(OfficiumSession.require(codec, session).accountId(), projectId);
    }

    @GET
    public List<ProjectView> list(@CookieParam(OfficiumSession.COOKIE) String session,
            @QueryParam("folderId") UUID folderId, @QueryParam("archived") String archivedRaw) {
        AccountSession account = OfficiumSession.require(codec, session);
        boolean filterByFolder = folderId != null;
        Boolean archived = switch (archivedRaw == null ? "" : archivedRaw) {
            case "true" -> Boolean.TRUE;
            case "all" -> null;
            default -> Boolean.FALSE;
        };
        return projects.list(account.accountId(), folderId, filterByFolder, archived);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@CookieParam(OfficiumSession.COOKIE) String session, CreateRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        Actor actor = OfficiumSession.actorOf(account);
        ProjectView created = projects.create(account.accountId(), request == null ? null : request.name(),
                request == null ? null : request.keyPrefix(), request == null ? null : request.folderId(),
                request == null ? null : request.icon(), request == null ? null : request.iconColor(), actor);
        return Response.status(Response.Status.CREATED).entity(created).build();
    }

    @GET
    @Path("/{id}")
    public ProjectView get(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("id") UUID id) {
        AccountSession account = OfficiumSession.require(codec, session);
        return projects.get(account.accountId(), id);
    }

    /** {@code projects.delete}'s REST twin (JAVA-1554): owner only, {@code ?confirm=} is the project's exact name. */
    @DELETE
    @Path("/{id}")
    public Response delete(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("id") UUID id,
            @QueryParam("confirm") String confirm) {
        projects.delete(OfficiumSession.require(codec, session).accountId(), id, confirm);
        return Response.noContent().build();
    }

    /** The languages every human card's form here is written in, the default first; [] none (JAVA-1082). */
    @PUT
    @Path("/{id}/form-languages")
    @Consumes(MediaType.APPLICATION_JSON)
    public ProjectView setFormLanguages(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("id") UUID id,
            FormLanguagesRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return projects.setFormLanguages(account.accountId(), id, request.expectedVersion(), request.formLanguages(),
                OfficiumSession.actorOf(account));
    }

    @PATCH
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    public ProjectView update(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("id") UUID id,
            UpdateRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        Actor actor = OfficiumSession.actorOf(account);
        return projects.update(account.accountId(), id, request.expectedVersion(), request.name(),
                request.folderId(), request.folderId() != null, request.icon(), request.iconColor(), actor);
    }

    /** Contributions (contract §8.3): {@code from}/{@code to} (yyyy-mm-dd, inclusive) or {@code sprintId}. */
    @GET
    @Path("/{id}/metrics")
    public MetricsService.MetricsView metrics(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("id") UUID id, @QueryParam("from") String from, @QueryParam("to") String to,
            @QueryParam("sprintId") UUID sprintId) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        return metrics.metrics(accountId, id, parseDate(from, "from"), parseDate(to, "to"), sprintId);
    }

    private static LocalDate parseDate(String raw, String field) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(raw);
        } catch (java.time.format.DateTimeParseException ex) {
            throw com.javadaba.contexts.officium.domain.OfficiumException.badRequest("invalid_" + field,
                    field + " must be yyyy-mm-dd");
        }
    }

    @POST
    @Path("/{id}/archive")
    @Consumes(MediaType.APPLICATION_JSON)
    public ProjectView archive(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("id") UUID id,
            VersionRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return projects.archive(account.accountId(), id, request.expectedVersion(), OfficiumSession.actorOf(account));
    }

    @POST
    @Path("/{id}/unarchive")
    @Consumes(MediaType.APPLICATION_JSON)
    public ProjectView unarchive(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("id") UUID id,
            VersionRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return projects.unarchive(account.accountId(), id, request.expectedVersion(), OfficiumSession.actorOf(account));
    }

    @GET
    @Path("/{id}/meta")
    public ProjectFacets meta(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("id") UUID id) {
        AccountSession account = OfficiumSession.require(codec, session);
        return cards.facets(account.accountId(), id);
    }

    @GET
    @Path("/{id}/timesheet")
    public TimesheetReport timesheet(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("id") UUID id,
            @QueryParam("from") String from, @QueryParam("to") String to, @QueryParam("person") String person) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        LocalDate fromDate = from == null ? LocalDate.now().minusMonths(1) : LocalDate.parse(from);
        LocalDate toDate = to == null ? LocalDate.now() : LocalDate.parse(to);
        return time.timesheet(accountId, id, fromDate, toDate, person);
    }

    @GET
    @Path("/{id}/activity")
    public Page<ActivityView> activity(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("id") UUID id,
            @QueryParam("cardId") UUID cardId, @QueryParam("cursor") String cursor,
            @QueryParam("limit") Integer limit) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        return activity.list(accountId, id, cardId, cursor, limit == null ? 50 : limit);
    }

    @POST
    @Path("/{id}/import/backlog")
    @Consumes(MediaType.APPLICATION_JSON)
    public BacklogImportExportService.ImportResult importBacklog(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("id") UUID id, ImportRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        List<BacklogImportExportService.BacklogFile> files = (request == null || request.files() == null
                ? List.<FileRequest>of()
                : request.files()).stream()
                .map(f -> new BacklogImportExportService.BacklogFile(f.name(), f.content()))
                .toList();
        return backlog.importMarkdown(account.accountId(), id, files, OfficiumSession.actorOf(account));
    }

    @GET
    @Path("/{id}/export/backlog")
    public ExportResponse exportBacklog(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("id") UUID id) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        List<FileRequest> files = backlog.exportMarkdown(accountId, id).stream()
                .map(f -> new FileRequest(f.name(), f.content()))
                .toList();
        return new ExportResponse(files);
    }

    public record FileRequest(String name, String content) {
    }

    public record ImportRequest(List<FileRequest> files) {
    }

    public record ExportResponse(List<FileRequest> files) {
    }

    public record CreateRequest(String name, String keyPrefix, UUID folderId, String icon, String iconColor) {
    }

    public record UpdateRequest(int expectedVersion, String name, UUID folderId, String icon, String iconColor) {
    }

    public record FormLanguagesRequest(int expectedVersion, List<String> formLanguages) {
    }

    /**
     * {@code runs}: {@code {row: {phase: {model, effort, roles?: {role: {model, effort}}}}}} (JAVA-915);
     * {@code mods}: {@code {row-or-signal: {phase: [modId]}}} (JAVA-1569).
     */
    public record RoleMatrixOverrides(Map<String, Map<String, List<String>>> categories,
            Map<String, Map<String, List<String>>> signals, Map<String, Map<String, Object>> runs,
            Map<String, Map<String, List<String>>> mods) {
    }

    public record RoleMatrixRequest(int expectedVersion, RoleMatrixOverrides overrides) {
    }

    public record VersionRequest(int expectedVersion) {
    }

    public record ActivateProfileRequest(String profileId, Boolean shuffle) {
    }
}
