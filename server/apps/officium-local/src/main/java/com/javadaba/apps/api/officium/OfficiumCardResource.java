package com.javadaba.apps.api.officium;

import static com.javadaba.apps.api.officium.OfficiumCardRequests.toAssignee;
import static com.javadaba.apps.api.officium.OfficiumCardRequests.toNewCard;

import com.javadaba.apps.api.account.AccountSession;
import com.javadaba.apps.api.account.AccountSessionCodec;
import com.javadaba.contexts.officium.application.AgentWorkService;
import com.javadaba.contexts.officium.application.AgentWorkView;
import com.javadaba.contexts.officium.application.CardAttachmentService;
import com.javadaba.contexts.officium.application.CardCommentService;
import com.javadaba.contexts.officium.application.CardDetailService;
import com.javadaba.contexts.officium.application.CardDetailView;
import com.javadaba.contexts.officium.application.CardFormService;
import com.javadaba.contexts.officium.application.CardFormView;
import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.application.CardTimeService;
import com.javadaba.contexts.officium.application.CardView;
import com.javadaba.contexts.officium.application.SessionQueueService;
import com.javadaba.contexts.officium.application.TimeEntryView;
import com.javadaba.contexts.officium.domain.Assignee;
import com.javadaba.contexts.officium.domain.CardComment;
import com.javadaba.contexts.officium.domain.CardSearchCriteria;
import com.javadaba.contexts.officium.domain.CardTimeEntry;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.LinkType;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Page;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.RejectionReason;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.RunState;
import com.javadaba.contexts.officium.domain.Status;
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
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

/** {@code /officium/v1/projects/{projectId}/cards/**} (contract §3): the card, its comments, time
 *  entries and attachments -- one class because they all nest under the same URL prefix. */
@Path("/officium/v1/projects/{projectId}/cards")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumCardResource {

    private final CardService cards;
    private final CardDetailService details;
    private final CardCommentService comments;
    private final CardTimeService time;
    private final CardAttachmentService attachments;
    private final AgentWorkService agentWork;
    private final OfficiumFileSwitchboard switchboard;
    private final SessionQueueService sessionQueue;
    private final AccountSessionCodec codec;
    private final CardFormService cardForms;

    public OfficiumCardResource(CardService cards, CardDetailService details, CardCommentService comments,
            CardTimeService time, CardAttachmentService attachments, AgentWorkService agentWork,
            OfficiumFileSwitchboard switchboard, SessionQueueService sessionQueue, AccountSessionCodec codec,
            CardFormService cardForms) {
        this.cards = cards;
        this.details = details;
        this.comments = comments;
        this.time = time;
        this.attachments = attachments;
        this.agentWork = agentWork;
        this.switchboard = switchboard;
        this.sessionQueue = sessionQueue;
        this.codec = codec;
        this.cardForms = cardForms;
    }

    @GET
    public Page<CardView> search(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @QueryParam("q") String q,
            @QueryParam("jql") String jql,
            @QueryParam("status") String status, @QueryParam("priority") String priority,
            @QueryParam("epic") String epic, @QueryParam("tag") String tag,
            @QueryParam("assignee") String assignee, @QueryParam("executor") String executor,
            @QueryParam("category") String category,
            @QueryParam("blocked") Boolean blocked, @QueryParam("humanEditPending") Boolean humanEditPending,
            @QueryParam("sort") String sort, @QueryParam("cursor") String cursor, @QueryParam("limit") Integer limit,
            @QueryParam("sprint") String sprint, @QueryParam("signal") String signal,
            @QueryParam("rejection") String rejection, @QueryParam("role") String role) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        // OQL (JDB-270): a query in `jql` runs through the same parser/evaluator as the search
        // view's client-side jql.ts, over the full project instead of the ANDed flat filters
        // below -- the two are alternative search modes, same as the view's Basic/OQL toggle.
        if (jql != null && !jql.isBlank()) {
            return cards.searchByJql(accountId, projectId, jql, cursor, limit == null ? 50 : limit);
        }
        CardService.SearchRequest request = new CardService.SearchRequest(q,
                status == null ? null : Status.fromWire(status), priority == null ? null : Priority.fromWire(priority),
                epic, tag, assignee, executor == null ? null : Executor.fromWire(executor),
                category == null ? null : Category.fromWire(category), blocked, humanEditPending,
                sort == null
                        ? CardSearchCriteria.Sort.ORDER
                        : CardSearchCriteria.Sort.valueOf(sort.toUpperCase(java.util.Locale.ROOT)),
                cursor, limit == null ? 50 : limit, sprint, signal == null ? null : Signal.fromWire(signal),
                rejection == null ? null : RejectionReason.fromWire(rejection), role);
        return cards.search(accountId, projectId, request);
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("projectId") UUID projectId,
            NewCardRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        CardView created = request.form() == null
                ? cards.create(account.accountId(), projectId, toNewCard(request), OfficiumSession.actorOf(account))
                : cardForms.create(account.accountId(), projectId, toNewCard(request),
                        CardFormRequest.toSpec(request.form()),
                        OfficiumSession.actorOf(account));
        return Response.status(Response.Status.CREATED).entity(withForm(account, projectId, created, request.form()))
                .build();
    }

    @POST
    @Path("/batch")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response createBatch(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, BatchRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        if (request != null && request.cards().stream().anyMatch(c -> c.form() != null)) {
            throw OfficiumException.badRequest("form_not_in_batch",
                    "A form goes on one card: create the card with its form on its own");
        }
        List<CardService.NewCard> newCards = (request == null ? List.<NewCardRequest>of() : request.cards()).stream()
                .map(OfficiumCardRequests::toNewCard).toList();
        List<CardView> created = cards.createBatch(account.accountId(), projectId, newCards,
                OfficiumSession.actorOf(account));
        return Response.status(Response.Status.CREATED).entity(created).build();
    }

    @POST
    @Path("/request-human")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response requestHuman(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, RequestHumanRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        Assignee assignee = request.assignee() == null ? null : toAssignee(request.assignee());
        CardService.RequestHuman requestHuman = new CardService.RequestHuman(request.title(), request.why(),
                request.steps(), request.doneWhen(), request.unblocks(), assignee,
                request.category() == null ? null : Category.fromWire(request.category()));
        CardView created = request.form() == null
                ? cards.requestHuman(account.accountId(), projectId, requestHuman, OfficiumSession.actorOf(account))
                : cardForms.requestHuman(account.accountId(), projectId, requestHuman,
                        CardFormRequest.toSpec(request.form()),
                        OfficiumSession.actorOf(account));
        return Response.status(Response.Status.CREATED).entity(withForm(account, projectId, created, request.form()))
                .build();
    }

    @GET
    @Path("/next")
    public Response next(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("projectId") UUID projectId,
            @QueryParam("beyondSprint") boolean beyondSprint) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        return agentWork.pick(accountId, projectId, beyondSprint, List.of()).<Response>map(view -> Response.ok(view)
                .build()).orElseGet(() -> Response.noContent().build());
    }

    @GET
    @Path("/needs-human")
    public List<CardView> needsHuman(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @QueryParam("assignee") String assignee) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        return cards.needsHuman(accountId, projectId, assignee);
    }

    /** Contract §4.1: the cards an agent is actively working on right now, with their live status
     *  lines. In-memory monitoring -- never part of the card or its history. */
    @GET
    @Path("/working")
    public List<AgentWorkView> working(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        return agentWork.active(accountId, projectId);
    }

    /** JAVA-200: the cards a session on {@code machine} left In progress and nobody is working now. */
    @GET
    @Path("/resumable")
    public List<AgentWorkService.ResumableView> resumable(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @QueryParam("machine") String machine) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        return agentWork.resumable(accountId, projectId, machine);
    }

    /** JAVA-45: a board keeps a copy and asks only for what changed since its {@code asOf}; without
     *  {@code since}, everything the board shows. */
    @GET
    @Path("/changes")
    public CardService.CardChangesView changes(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @QueryParam("since") String since) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        Instant from;
        try {
            from = since == null || since.isBlank() ? null : Instant.parse(since);
        } catch (DateTimeParseException ex) {
            throw OfficiumException.badRequest("invalid_since", "since must be an ISO-8601 instant");
        }
        return cards.changes(accountId, projectId, from);
    }

    @GET
    @Path("/{keyOrId}")
    public CardDetailView get(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId) {
        return details.get(OfficiumSession.require(codec, session).accountId(), projectId, keyOrId);
    }

    @PATCH
    @Path("/{cardId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public CardView update(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("projectId") UUID projectId,
            @PathParam("cardId") UUID cardId, UpdateCardRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        CardService.CardEdit edit = new CardService.CardEdit(request.title(), request.description(),
                request.actionPlan(), request.priority() == null ? null : Priority.fromWire(request.priority()),
                request.category(), request.estimate(),
                request.epic(), request.tags(), request.assignees() == null
                        ? null
                        : request.assignees().stream().map(OfficiumCardRequests::toAssignee).toList(),
                request.signals(), request.subtype());
        return cards.update(account.accountId(), projectId, cardId, request.expectedVersion(), edit,
                OfficiumSession.actorOf(account));
    }

    /** {@code cards.acknowledgeHumanEdit}'s REST twin (contract §1.1). Not versioned. */
    @POST
    @Path("/{keyOrId}/human-edit/acknowledge")
    public CardView acknowledgeHumanEdit(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId) {
        AccountSession account = OfficiumSession.require(codec, session);
        return cards.acknowledgeHumanEdit(account.accountId(), projectId, keyOrId, OfficiumSession.actorOf(account));
    }

    @POST
    @Path("/{cardId}/move")
    @Consumes(MediaType.APPLICATION_JSON)
    public CardView move(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("projectId") UUID projectId,
            @PathParam("cardId") UUID cardId, OfficiumMoveRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return cards.move(account.accountId(), projectId, cardId, request.expectedVersion(),
                Status.fromWire(request.status()), request.position(), request.rejection(),
                request.reviewReturn(), request.qualityScorecard(), request.role(), OfficiumSession.actorOf(account));
    }

    @POST
    @Path("/{cardId}/sprint")
    @Consumes(MediaType.APPLICATION_JSON)
    public CardView setSprint(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("cardId") UUID cardId, SprintRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return cards.setSprint(account.accountId(), projectId, cardId, request.expectedVersion(), request.sprintId(),
                request.position() == null ? Integer.MAX_VALUE : request.position(), OfficiumSession.actorOf(account));
    }

    @POST
    @Path("/{cardId}/run-state")
    @Consumes(MediaType.APPLICATION_JSON)
    public CardView setRunState(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("cardId") UUID cardId, RunStateRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return cards.setRunState(account.accountId(), projectId, cardId, request.expectedVersion(),
                RunState.fromWire(request.runState()), OfficiumSession.actorOf(account));
    }

    @POST
    @Path("/{keyOrId}/working")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response setActivelyWorking(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId,
            ActivelyWorkingRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        if (request == null || request.activelyWorking() == null) {
            throw OfficiumException.badRequest("actively_working_required", "activelyWorking must be true or false");
        }
        return agentWork.setActivelyWorking(account.accountId(), projectId, keyOrId, request.activelyWorking(),
                OfficiumSession.actorOf(account))
                .<Response>map(view -> Response.ok(view).build())
                .orElseGet(() -> Response.noContent().build());
    }

    /** JAVA-561 (contract §4.3): queue the card into one of the caller's own agent windows. */
    @PUT
    @Path("/{keyOrId}/queue")
    @Consumes(MediaType.APPLICATION_JSON)
    public SessionQueueService.QueuedCardView queue(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId, QueueRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return sessionQueue.queue(account.accountId(), projectId, keyOrId,
                request == null ? null : request.sessionId(), OfficiumSession.actorOf(account));
    }

    @DELETE
    @Path("/{keyOrId}/queue")
    public Response unqueue(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId) {
        AccountSession account = OfficiumSession.require(codec, session);
        sessionQueue.unqueue(account.accountId(), projectId, keyOrId, OfficiumSession.actorOf(account));
        return Response.noContent().build();
    }

    @POST
    @Path("/{keyOrId}/working/status")
    @Consumes(MediaType.APPLICATION_JSON)
    public AgentWorkView reportStatus(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId, TextRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return agentWork.reportStatus(account.accountId(), projectId, keyOrId,
                request == null ? null : request.text(), OfficiumSession.actorOf(account));
    }

    @POST
    @Path("/{cardId}/executor")
    @Consumes(MediaType.APPLICATION_JSON)
    public CardView setExecutor(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("cardId") UUID cardId, ExecutorRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        Assignee assignee = request.assignee() == null ? null : toAssignee(request.assignee());
        return cards.setExecutor(account.accountId(), projectId, cardId, request.expectedVersion(),
                Executor.fromWire(request.executor()), assignee, OfficiumSession.actorOf(account));
    }

    @POST
    @Path("/{cardId}/links")
    @Consumes(MediaType.APPLICATION_JSON)
    public CardView link(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("projectId") UUID projectId,
            @PathParam("cardId") UUID cardId, LinkRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return cards.link(account.accountId(), projectId, cardId, request.expectedVersion(),
                LinkType.valueOf(request.type().toUpperCase(java.util.Locale.ROOT)), request.target(),
                OfficiumSession.actorOf(account));
    }

    @DELETE
    @Path("/{cardId}/links")
    @Consumes(MediaType.APPLICATION_JSON)
    public CardView unlink(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("projectId") UUID projectId,
            @PathParam("cardId") UUID cardId, LinkRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return cards.unlink(account.accountId(), projectId, cardId, request.expectedVersion(),
                LinkType.valueOf(request.type().toUpperCase(java.util.Locale.ROOT)), request.target(),
                OfficiumSession.actorOf(account));
    }

    @DELETE
    @Path("/{cardId}")
    public Response delete(@CookieParam(OfficiumSession.COOKIE) String session, @PathParam("projectId") UUID projectId,
            @PathParam("cardId") UUID cardId, @QueryParam("expectedVersion") int expectedVersion) {
        AccountSession account = OfficiumSession.require(codec, session);
        cards.delete(account.accountId(), projectId, cardId, expectedVersion, OfficiumSession.actorOf(account));
        return Response.noContent().build();
    }

    // ── the form a human card is answered with (JAVA-894) ───────────────────────────────────

    /** Gives a human card its form, or its questions anew while nobody has answered it. */
    @PUT
    @Path("/{keyOrId}/form")
    @Consumes(MediaType.APPLICATION_JSON)
    public CardFormView attachForm(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId, CardFormRequest request) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        return cardForms.attach(accountId, projectId, keyOrId, CardFormRequest.toSpec(request));
    }

    /** A card born with a form answers with its detail, form included; any other, as it always did. */
    private Object withForm(AccountSession account, UUID projectId, CardView created, CardFormRequest form) {
        return form == null ? created : details.get(account.accountId(), projectId, created.key());
    }

    @GET
    @Path("/{keyOrId}/form")
    public CardFormView form(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId) {
        UUID accountId = OfficiumSession.require(codec, session).accountId();
        return cardForms.find(accountId, projectId, keyOrId)
                .orElseThrow(() -> OfficiumException.notFound("card_form_not_found", "This card has no form"));
    }

    // ── comments ────────────────────────────────────────────────────────────────────────────

    @POST
    @Path("/{keyOrId}/comments")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response addComment(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId, CommentRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        CardComment created = comments.add(account.accountId(), projectId, keyOrId,
                request == null ? null : request.text(), request == null ? null : request.parentId(),
                OfficiumSession.actorOf(account));
        return Response.status(Response.Status.CREATED).entity(created).build();
    }

    @PATCH
    @Path("/{keyOrId}/comments/{commentId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public CardComment editComment(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId,
            @PathParam("commentId") UUID commentId, TextRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        return comments.edit(account.accountId(), projectId, keyOrId, commentId,
                request == null ? null : request.text(), OfficiumSession.actorOf(account));
    }

    @DELETE
    @Path("/{keyOrId}/comments/{commentId}")
    public Response deleteComment(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId,
            @PathParam("commentId") UUID commentId) {
        AccountSession account = OfficiumSession.require(codec, session);
        comments.delete(account.accountId(), projectId, keyOrId, commentId, OfficiumSession.actorOf(account));
        return Response.noContent().build();
    }

    // ── time ────────────────────────────────────────────────────────────────────────────────

    @POST
    @Path("/{keyOrId}/time")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response addTime(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId, TimeRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        if (request == null || request.date() == null) {
            throw OfficiumException.badRequest("date_required", "date is required");
        }
        CardTimeEntry created = time.add(account.accountId(), projectId, keyOrId, LocalDate.parse(request.date()),
                request.hours(), request.who(), request.note(), OfficiumSession.actorOf(account));
        return Response.status(Response.Status.CREATED).entity(TimeEntryView.of(created, keyOrId)).build();
    }

    @PATCH
    @Path("/{keyOrId}/time/{entryId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public TimeEntryView editTime(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId,
            @PathParam("entryId") UUID entryId, TimeRequest request) {
        AccountSession account = OfficiumSession.require(codec, session);
        CardTimeEntry updated = time.edit(account.accountId(), projectId, keyOrId, entryId,
                request.date() == null ? null : LocalDate.parse(request.date()),
                request.hours() == 0 ? null : request.hours(),
                request.who(), request.note(), OfficiumSession.actorOf(account));
        return TimeEntryView.of(updated, keyOrId);
    }

    @DELETE
    @Path("/{keyOrId}/time/{entryId}")
    public Response deleteTime(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId,
            @PathParam("entryId") UUID entryId) {
        AccountSession account = OfficiumSession.require(codec, session);
        time.delete(account.accountId(), projectId, keyOrId, entryId, OfficiumSession.actorOf(account));
        return Response.noContent().build();
    }

    // ── attachments ─────────────────────────────────────────────────────────────────────────
    //
    // No upload or download here (JDB-242): the bytes travel browser <-> the project's machine
    // through WS /officium/v1/projects/{id}/files (OfficiumFilesSocket). Deleting is plain REST;
    // the machine is told to remove its copy when it is online, and an offline one keeps an
    // orphan file in its own directory, never on our disk.

    @DELETE
    @Path("/{keyOrId}/attachments/{attachmentId}")
    public Response deleteAttachment(@CookieParam(OfficiumSession.COOKIE) String session,
            @PathParam("projectId") UUID projectId, @PathParam("keyOrId") String keyOrId,
            @PathParam("attachmentId") UUID attachmentId) {
        AccountSession account = OfficiumSession.require(codec, session);
        var removed = attachments.delete(account.accountId(), projectId, keyOrId, attachmentId,
                OfficiumSession.actorOf(account));
        switchboard.deleteOnMachine(projectId, removed.path());
        return Response.noContent().build();
    }

    // ── request shapes ──────────────────────────────────────────────────────────────────────

    public record AssigneeRequest(UUID accountId, String name) {
    }

    public record NewCardRequest(String title, String description, String actionPlan, String status, String priority,
            String executor, String category, Double estimate, String epic, List<String> tags,
            List<AssigneeRequest> assignees, List<String> related, List<String> blocks, String clientKey,
            UUID sprintId, List<String> signals, String subtype, CardFormRequest form) {
    }

    /** {@code sprintId} null = the backlog; {@code position} null = the end (contract §8.2). */
    public record SprintRequest(int expectedVersion, UUID sprintId, Integer position) {
    }

    public record BatchRequest(List<NewCardRequest> cards) {
    }

    public record RequestHumanRequest(String title, String why, String steps, String doneWhen,
            List<String> unblocks, AssigneeRequest assignee, String category, CardFormRequest form) {
    }

    /** {@code category: ""} takes the card's category away; left out, it is left alone. Same for
     *  {@code signals}: {@code []} clears them. {@code subtype} only on a spike (JAVA-391). */
    public record UpdateCardRequest(int expectedVersion, String title, String description, String actionPlan,
            String priority, String category, Double estimate, String epic, List<String> tags,
            List<AssigneeRequest> assignees, List<String> signals, String subtype) {
    }

    public record RunStateRequest(int expectedVersion, String runState) {
    }

    public record QueueRequest(String sessionId) {
    }

    public record ActivelyWorkingRequest(Boolean activelyWorking) {
    }

    public record ExecutorRequest(int expectedVersion, String executor, AssigneeRequest assignee) {
    }

    public record LinkRequest(int expectedVersion, String type, String target) {
    }

    public record TextRequest(String text) {
    }

    /** {@code parentId}: the comment of the same card this one replies to, absent at the top level. */
    public record CommentRequest(String text, UUID parentId) {
    }

    public record TimeRequest(String date, double hours, String who, String note) {
    }
}
