package com.javadaba.contexts.officium.application.mcp;

import static com.javadaba.contexts.officium.application.mcp.McpEnums.categoryEnum;
import static com.javadaba.contexts.officium.application.mcp.McpEnums.executorEnum;
import static com.javadaba.contexts.officium.application.mcp.McpEnums.priorityEnum;
import static com.javadaba.contexts.officium.application.mcp.McpEnums.projectColorEnum;
import static com.javadaba.contexts.officium.application.mcp.McpEnums.runStateEnum;
import static com.javadaba.contexts.officium.application.mcp.McpEnums.signalEnum;
import static com.javadaba.contexts.officium.application.mcp.McpEnums.statusEnum;
import static com.javadaba.contexts.officium.application.mcp.McpEnums.subtypeEnum;
import static com.javadaba.contexts.officium.application.mcp.McpEnums.wires;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.ActivityService;
import com.javadaba.contexts.officium.application.AgentWorkService;
import com.javadaba.contexts.officium.application.CardCommentService;
import com.javadaba.contexts.officium.application.CardDetailService;
import com.javadaba.contexts.officium.application.CardWorkflowService;
import com.javadaba.contexts.officium.application.CardFormService;
import com.javadaba.contexts.officium.application.CardRequestService;
import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.application.CardTimeService;
import com.javadaba.contexts.officium.application.CardView;
import com.javadaba.contexts.officium.application.ChangelogService;
import com.javadaba.contexts.officium.application.DocAttachmentService;
import com.javadaba.contexts.officium.application.DocCommentService;
import com.javadaba.contexts.officium.application.DocHistoryService;
import com.javadaba.contexts.officium.application.DocMoveService;
import com.javadaba.contexts.officium.application.DocPresenceService;
import com.javadaba.contexts.officium.application.DocStarService;
import com.javadaba.contexts.officium.application.DocImportService;
import com.javadaba.contexts.officium.application.DocLifecycleService;
import com.javadaba.contexts.officium.application.DocSchema;
import com.javadaba.contexts.officium.application.DocService;
import com.javadaba.contexts.officium.application.DocSearchService;
import com.javadaba.contexts.officium.application.DocTreeService;
import com.javadaba.contexts.officium.application.HeartbeatService;
import com.javadaba.contexts.officium.application.ProjectMembershipService;
import com.javadaba.contexts.officium.application.QualitySettingsService;
import com.javadaba.contexts.officium.application.ProjectMachineService;
import com.javadaba.contexts.officium.application.AgentAttention;
import com.javadaba.contexts.officium.application.ProjectService;
import com.javadaba.contexts.officium.application.PrecedenceService;
import com.javadaba.contexts.officium.application.PriorFailureService;
import com.javadaba.contexts.officium.application.QualitySettingsService;
import com.javadaba.contexts.officium.application.RoleMatrixService;
import com.javadaba.contexts.officium.application.WorkProfileService;
import com.javadaba.contexts.officium.application.AutoloopService;
import com.javadaba.contexts.officium.application.SessionQueueService;
import com.javadaba.contexts.officium.application.StorageQuotaService;
import com.javadaba.contexts.officium.application.MetricsService;
import com.javadaba.contexts.officium.application.OrganizationService;
import com.javadaba.contexts.officium.application.SprintService;
import com.javadaba.contexts.officium.application.TestHistoryService;
import com.javadaba.contexts.officium.domain.SprintState;
import com.javadaba.contexts.officium.application.backlog.BacklogImportExportService;
import com.javadaba.contexts.officium.application.github.GithubService;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Assignee;
import com.javadaba.contexts.officium.domain.CardSearchCriteria;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.LinkType;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.RejectionReason;
import com.javadaba.contexts.officium.domain.RunState;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.SpikeSubtype;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpOperationRegistry;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;
import com.javadaba.platform.mcp.McpToolException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * The Officium MCP operation table (contract §5): one row per operation, generated into
 * {@code discover}'s answer, dispatched by {@code query}. Every handler calls the exact same
 * {@code *Service} methods REST does (contract §1.1) -- this class is pure wiring, no business
 * rule lives here.
 */
@ApplicationScoped
public class OfficiumMcpRegistry {

    private static final String READ = McpOperation.READ;
    private static final String WRITE = McpOperation.WRITE;
    private static final String SCOPE_READ = "officium:read";
    private static final String SCOPE_WRITE = "officium:write";
    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String EX_CARD = "22222222-2222-2222-2222-222222222222";
    private static final String MACHINE_HINT = "Pass `machine` (this computer's name) so a later session on it "
            + "can find a card you left In progress with cards.resumable; any write accepts it.";

    private final McpOperationRegistry<OfficiumCaller> registry;

    @Inject
    public OfficiumMcpRegistry(ProjectService projects, ProjectMembershipService members, CardService cards,
            CardDetailService details, CardCommentService comments, CardTimeService time, DocStarService docStars,
            ActivityService activityService, BacklogImportExportService backlog, AgentWorkService agentWork,
            ProjectMachineService machines, StorageQuotaService quota, SprintService sprints, MetricsService metrics,
            OrganizationService organization, DocService docs, ChangelogService changelog,
            RoleMatrixService roleMatrices, GithubService github, SessionQueueService sessionQueue,
            HeartbeatService heartbeat, TestHistoryService testHistory, DocImportService docImports,
            DocSchema docSchema, DocTreeService docTree, CardFormService cardForms, CardRequestService cardRequests,
            AgentAttention attention, DocHistoryService docHistory, DocLifecycleService docLifecycle,
            DocPresenceService docPresence, DocMoveService docMoves, DocAttachmentService docFiles,
            DocSearchService docSearch, DocCommentService docComments, WorkProfileService profiles,
            AutoloopService autoloops, CardWorkflowService cardWorkflows, PrecedenceService precedence,
            PriorFailureService priorFailures, QualitySettingsService qualitySettings) {
        this.registry = new McpOperationRegistry<>(buildOperations(projects, members, cards, details,
                comments, time,
                activityService, backlog, agentWork, machines, quota, sprints, metrics, organization, docs, changelog,
                roleMatrices, github, sessionQueue, heartbeat, testHistory, docImports, docSchema, docTree, cardForms,
                cardRequests, attention, docHistory, docLifecycle, docPresence, docMoves, docStars, docFiles,
                docSearch, docComments, profiles, autoloops, cardWorkflows, precedence, priorFailures,
                qualitySettings));
    }

    public McpOperationRegistry<OfficiumCaller> registry() {
        return registry;
    }

    /** Who is calling: the account an OAuth token was issued for, and the {@link Actor} every
     *  mutation records (contract §1.1) -- {@code Actor.agent(accountId, clientName)} for MCP. */
    public record OfficiumCaller(UUID accountId, Actor actor) {
    }

    // ── the table ───────────────────────────────────────────────────────────────────────────

    // Package-private (not private): OfficiumMcpRegistryTest builds the table with every service
    // reference null to check the schemas/examples themselves -- the lambdas only CAPTURE those
    // references, never call them until a handler actually runs, so this is safe for that one use.
    static List<McpOperation<OfficiumCaller>> buildOperations(ProjectService projects, ProjectMembershipService members,
            CardService cards, CardDetailService details, CardCommentService comments, CardTimeService time,
            ActivityService activityService, BacklogImportExportService backlog, AgentWorkService agentWork,
            ProjectMachineService machines, StorageQuotaService quota, SprintService sprints, MetricsService metrics,
            OrganizationService organization, DocService docs, ChangelogService changelog,
            RoleMatrixService roleMatrices, GithubService github, SessionQueueService sessionQueue,
            HeartbeatService heartbeat, TestHistoryService testHistory, DocImportService docImports,
            DocSchema docSchema, DocTreeService docTree, CardFormService cardForms, CardRequestService cardRequests,
            AgentAttention attention, DocHistoryService docHistory, DocLifecycleService docLifecycle,
            DocPresenceService docPresence, DocMoveService docMoves, DocStarService docStars,
            DocAttachmentService docFiles, DocSearchService docSearch, DocCommentService docComments,
            WorkProfileService profiles, AutoloopService autoloops, CardWorkflowService cardWorkflows,
            PrecedenceService precedence, PriorFailureService priorFailures, QualitySettingsService qualitySettings) {
        List<McpOperation<OfficiumCaller>> list = new ArrayList<>();

        list.add(new McpOperation<>("meta.states", "The fixed vocabulary (statuses/priorities/runStates/executors/"
                + "roles/categories), plus a project's epics/tags/assignees in use when projectId is given. "
                + "`categoryGuide` says what each category means -- which cards belong in it and the rules that "
                + "come with it: read it before choosing a card's category, and when a card fits several, "
                + "the first in `classifierPrecedence` wins (epic is never chosen that way). `signals` is the "
                + "vocabulary of a "
                + "card's `signals` field (what about its work brings roles its category alone does not), and "
                + "`roleMatrix` says which Fluxor roles work a card by category and phase (refine; action = "
                + "todo/doing; ready; review; deploy) plus the roles each signal adds -- the project's own "
                + "matrix when projectId is given. Every card carries the result as `eligibleRoles`. Call this "
                + "once before creating, classifying or filtering cards.", READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of()),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> McpMetaStates.result(cards, roleMatrices, caller, params)));

        list.add(new McpOperation<>("projects.list",
                "Every project you can see (owned or invited into). Start here to find a projectId.", READ,
                SCOPE_READ,
                McpSchemas.schema(Map.of("folderId", McpSchemas.string(), "archived", McpSchemas.bool()), List.of()),
                Map.of(),
                (caller, params) -> projects.list(caller.accountId(), McpParams.optionalUuid(params, "folderId"),
                        params.hasNonNull("folderId"), McpParams.bool(params, "archived", null))));

        list.add(new McpOperation<>("projects.get", "One project's detail, including your role on it.", READ,
                SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> projects.get(caller.accountId(), McpParams.uuid(params, "projectId"))));

        list.add(new McpOperation<>("projects.create",
                "Creates a new backlog. keyPrefix must be 2-10 upper-case letters/digits (e.g. \"OFF\"); every "
                        + "card key in the project starts with it.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("name", McpSchemas.string(), "keyPrefix", McpSchemas.string(), "folderId",
                        McpSchemas.string(), "icon", McpSchemas.string(), "iconColor", projectColorEnum()),
                        List.of("name", "keyPrefix")),
                Map.of("name", "New project", "keyPrefix", "NEW"),
                (caller, params) -> projects.create(caller.accountId(), McpParams.requiredString(params, "name"),
                        McpParams.requiredString(params, "keyPrefix"), McpParams.optionalUuid(params, "folderId"),
                        McpParams.string(params, "icon", null), McpParams.string(params, "iconColor", null),
                        caller.actor())));

        list.add(new McpOperation<>("projects.update",
                "Renames a project, moves it to a folder, or (owner only) changes its sidebar icon and color. "
                        + "Only the fields you send change; `expectedVersion` works as on cards.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "expectedVersion", McpSchemas.integer(),
                        "name", McpSchemas.string(), "folderId", McpSchemas.string(), "icon", McpSchemas.string(),
                        "iconColor", projectColorEnum()), List.of("projectId", "expectedVersion")),
                Map.of("projectId", EX_PROJECT, "expectedVersion", 1, "icon", "rocket", "iconColor", "violet"),
                (caller, params) -> projects.update(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.integer(params, "expectedVersion", 0), McpParams.string(params, "name", null),
                        McpParams.optionalUuid(params, "folderId"), params.hasNonNull("folderId"),
                        McpParams.string(params, "icon", null), McpParams.string(params, "iconColor", null),
                        caller.actor())));

        list.addAll(McpProjectStandards.operations(projects));
        list.addAll(McpPriorFailures.operations(priorFailures, qualitySettings));

        list.addAll(McpRoleMatrix.operations(roleMatrices));
        list.addAll(McpPrecedence.operations(precedence));

        list.add(new McpOperation<>("members.list", "Everyone with access to a project, owner included.", READ,
                SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> members.list(caller.accountId(), McpParams.uuid(params, "projectId"))));

        list.add(McpCardSearch.operation(cards));

        list.add(new McpOperation<>("cards.get",
                "One card's full detail (comments, time entries, attachments included) by key (\"OFF-12\") or id. "
                        + "`eligibleRoles` are the Fluxor roles that may work it now, from its category, the "
                        + "phase its status is in and its `signals` (meta.states' `roleMatrix`); `runConfigs` "
                        + "gives each of them its {model, effort} and `toolTier`, and `runConfig` the cell's. An "
                        + "epic also "
                        + "carries `epicChildren`, how many cards belong to it (a card whose `epic` names its key, "
                        + "or the label only this epic carries), and `epicChildrenOpen`, how many of them are not "
                        + "done or rejected. An epic's status follows its children's: it is moved by hand only once "
                        + "`epicChildrenOpen` is 0, between review, deploy and done, or to rejected. A rejected card "
                        + "carries `rejection` {reason, label, note, card}.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "keyOrId", McpSchemas.string()),
                        List.of("projectId", "keyOrId")),
                Map.of("projectId", EX_PROJECT, "keyOrId", "OFF-12"),
                (caller, params) -> details.get(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "keyOrId"))));

        list.addAll(McpCardNext.operations(agentWork));

        list.add(new McpOperation<>("cards.needsHuman",
                "Cards only a person can do -- \"not yours\" by design -- still in refine, todo or doing: from "
                        + "ready on the person's part is done. Pass assignee=\"me\" for what needs YOU "
                        + "specifically. `humanEditPending: true` on one means the person changed it since an "
                        + "agent last looked: the step it waits on may be done.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "assignee", McpSchemas.string()),
                        List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> McpWallGate.needsHuman(cards, cardForms, caller, params)));

        list.add(new McpOperation<>("cards.activity",
                "The project's (or one card's) change log, newest first, with cursor paging.", READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string(), "cursor",
                        McpSchemas.string(), "limit", McpSchemas.integer()), List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> activityService.list(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpCardRef.optionalId(cards, caller, params), McpParams.string(params, "cursor", null),
                        McpParams.integer(params, "limit", 50))));

        list.add(McpCardCreate.operation(cards, cardForms, details, agentWork, cardWorkflows));

        list.add(new McpOperation<>("cards.update",
                "Partial update of a card's own fields (title/description/actionPlan/priority/category/"
                        + "estimate/epic/tags/assignees/signals/subtype) -- not status/executor/runState, those have "
                        + "their own operations. `subtype` is a spike's alone (`technical` or `ux-ui`), and a card "
                        + "that stops being a spike loses it. `description` says what the card is; `actionPlan` (Markdown) says how it "
                        + "will be tackled -- write it before you start a card (an `ai` card in `refine` takes its workflow first). `category` says what kind of work "
                        + "it is: pick it from meta.states' `categoryGuide`, which says what each one means and "
                        + "the rules it brings; \"\" clears it. Sending what the card already says "
                        + "changes nothing (no new version). An `ai` feature, bug, hotfix or regression card's title "
                        + "and description are yours to change only in `refine`: past it they answer "
                        + "`contract_unmet` (ticking checklist boxes passes), so move it back first, or put what "
                        + "you found in a comment or a card of its own. `expectedVersion` must match the card's current "
                        + "version; a stale one answers with `version_conflict` and the CURRENT card: re-read, "
                        + "merge your change onto it, and retry with the new version.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(cardEditProperties(), List.of("projectId", "cardId", "expectedVersion")),
                Map.of("projectId", EX_PROJECT, "cardId", EX_CARD, "expectedVersion", 1, "title", "Updated title"),
                (caller, params) -> following(agentWork, params, caller.actor(), AgentWorkService.Signal.CONTINUES,
                        cards.update(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpCardRef.id(cards, caller, params), McpParams.integer(params, "expectedVersion", 0),
                                new CardService.CardEdit(McpParams.string(params, "title", null),
                                        McpParams.string(params, "description", null),
                                        McpParams.string(params, "actionPlan", null), priority(params),
                                        McpParams.string(params, "category", null),
                                        McpParams.number(params, "estimate", null),
                                        McpParams.string(params, "epic", null),
                                        params.hasNonNull("tags") ? McpParams.stringArray(params, "tags") : null,
                                        params.hasNonNull("assignees") ? assignees(params) : null,
                                        params.hasNonNull("signals")
                                                ? McpParams.stringArray(params, "signals")
                                                : null,
                                        McpParams.string(params, "subtype", null)),
                                caller.actor()))));

        list.add(new McpOperation<>("cards.acknowledgeHumanEdit",
                "Marks that you have read what a person changed on this card (by key or id): it stops "
                        + "answering `humanEditPending: true` until a person changes it again. Call it after "
                        + "reviewing the change -- whether or not you act on it. Not versioned: it never "
                        + "conflicts with a person's open edit.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string()),
                        List.of("projectId", "cardId")),
                Map.of("projectId", EX_PROJECT, "cardId", "OFF-12"),
                (caller, params) -> cards.acknowledgeHumanEdit(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "cardId"), caller.actor())));

        list.add(McpCardMove.operation(cards, agentWork));
        list.add(McpCardWorkflow.operation(cardWorkflows, agentWork, cards));

        list.add(new McpOperation<>("cards.setRunState",
                "Sets whether an agent is running this card now. A `human` card only ever accepts `idle` -- "
                        + "answers `human_card_not_runnable` for anything else, readable and final: don't retry it, "
                        + "use cards.requestHuman on a NEW card instead. An epic never runs "
                        + "(`epic_not_workable`): work its children. " + MACHINE_HINT,
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(
                        Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer(), "runState", runStateEnum(), "machine", McpSchemas.string()),
                        List.of("projectId", "cardId", "expectedVersion", "runState")),
                Map.of("projectId", EX_PROJECT, "cardId", EX_CARD, "expectedVersion", 1, "runState", "running"),
                (caller, params) -> {
                    RunState runState = RunState.fromWire(McpParams.requiredString(params, "runState"));
                    return following(agentWork, params, caller.actor(), AgentWorkService.Signal.ofRunState(runState),
                            cards.setRunState(caller.accountId(), McpParams.uuid(params, "projectId"),
                                    McpCardRef.id(cards, caller, params),
                                    McpParams.integer(params, "expectedVersion", 0), runState, caller.actor()));
                }));

        list.add(new McpOperation<>("cards.setActivelyWorking",
                "Tells the people watching the board that you are working on this card RIGHT NOW (the card "
                        + "lights up and appears in a live list). Call it with `true` when you start a card and "
                        + "`false` when you finish or stop. Not versioned and not recorded in the card's history. "
                        + "Your own writes do it too: cards.move to `doing` or cards.setRunState `running` starts "
                        + "it, a move anywhere else or any other runState stops it, and any other write to the "
                        + "card renews it. It expires on its own 10 minutes after the last of those, so a long "
                        + "task should keep reporting (cards.reportStatus). A `human` card answers "
                        + "`human_card_not_runnable`, and `true` on an epic `epic_not_workable`. " + MACHINE_HINT,
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(
                        Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string(), "activelyWorking",
                                McpSchemas.bool(), "machine", McpSchemas.string()),
                        List.of("projectId", "cardId", "activelyWorking")),
                Map.of("projectId", EX_PROJECT, "cardId", EX_CARD, "activelyWorking", true),
                (caller, params) -> {
                    var work = agentWork.setActivelyWorking(caller.accountId(), McpParams.uuid(params, "projectId"),
                            McpParams.requiredString(params, "cardId"),
                            McpParams.bool(params, "activelyWorking", false),
                            caller.actor());
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("activelyWorking", work.isPresent());
                    result.put("work", work.orElse(null));
                    return result;
                }));

        list.add(new McpOperation<>("cards.reportStatus",
                "A short live status line while you work a card (\"Running the test suite\", \"Fixing the "
                        + "failing import\"). Shown in the card's modal as real-time monitoring only: it is NOT a "
                        + "comment and is not stored in the card's history -- use cards.comment for anything worth "
                        + "keeping. Marks the card as actively working if it wasn't, and renews its expiry. Max 500 "
                        + "characters; the last 50 lines are kept. Not on an epic (`epic_not_workable`). "
                        + MACHINE_HINT,
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string(), "text",
                        McpSchemas.string(), "machine", McpSchemas.string()), List.of("projectId", "cardId", "text")),
                Map.of("projectId", EX_PROJECT, "cardId", EX_CARD, "text", "Running the test suite"),
                (caller, params) -> agentWork.reportStatus(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "cardId"), McpParams.requiredString(params, "text"),
                        caller.actor())));

        list.add(new McpOperation<>("cards.working",
                "The cards an agent is actively working on right now in this project, each with its live "
                        + "status lines (newest first). Check it before picking a card, so two agents don't work "
                        + "the same one.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> agentWork.active(caller.accountId(), McpParams.uuid(params, "projectId"))));

        list.add(new McpOperation<>("cards.workingEverywhere",
                "cards.working over every project you can see, grouped by project: each project with at least "
                        + "one card an agent is working on right now, and each of those cards with its session "
                        + "(latest status first). Projects with nothing running are left out.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of(), List.of()),
                Map.of(),
                (caller, params) -> agentWork.activeEverywhere(caller.accountId())));

        list.add(new McpOperation<>("cards.resumable",
                "The cards a session on `machine` left In progress and nobody is working now: their latest agent "
                        + "run came from that machine and has no live session. That is what a session that died "
                        + "mid-task leaves behind -- resume these before picking a new card (its work is usually "
                        + "still uncommitted on that machine). Each comes with its `lastRun`. A card run from "
                        + "another machine is never listed.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "machine", McpSchemas.string()),
                        List.of("projectId", "machine")),
                Map.of("projectId", EX_PROJECT, "machine", "my-laptop"),
                (caller, params) -> agentWork.resumable(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "machine"))));

        list.add(new McpOperation<>("cards.setExecutor",
                "Switches who can run this card. Switching to `human` defaults the assignee to the project owner "
                        + "if none is given, and forces runState back to idle.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(
                        Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer(), "executor", executorEnum(), "assignee", assigneeSchema()),
                        List.of("projectId", "cardId", "expectedVersion", "executor")),
                Map.of("projectId", EX_PROJECT, "cardId", EX_CARD, "expectedVersion", 1, "executor", "human"),
                (caller, params) -> McpWallGate.setExecutor(cards, cardForms, caller, params)));

        list.add(new McpOperation<>("cards.link",
                "Links two cards of the same project: `related` (symmetric) or `blocks` (this card blocks "
                        + "`target`; `blocks_cycle` if that closes a loop). A finished blocker moves to `relatedBy`; unlink it as `blocks`.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(linkProperties(),
                        List.of("projectId", "cardId", "expectedVersion", "type", "target")),
                Map.of("projectId", EX_PROJECT, "cardId", EX_CARD, "expectedVersion", 1, "type", "related", "target",
                        "OFF-13"),
                (caller, params) -> following(agentWork, params, caller.actor(), AgentWorkService.Signal.CONTINUES,
                        cards.link(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpCardRef.id(cards, caller, params), McpParams.integer(params, "expectedVersion", 0),
                                LinkType.valueOf(McpParams.requiredString(params, "type").toUpperCase(Locale.ROOT)),
                                McpParams.requiredString(params, "target"), caller.actor()))));

        list.add(new McpOperation<>("cards.unlink", "Removes a link created by cards.link.", WRITE, SCOPE_WRITE,
                McpSchemas.schema(linkProperties(),
                        List.of("projectId", "cardId", "expectedVersion", "type", "target")),
                Map.of("projectId", EX_PROJECT, "cardId", EX_CARD, "expectedVersion", 1, "type", "related", "target",
                        "OFF-13"),
                (caller, params) -> following(agentWork, params, caller.actor(), AgentWorkService.Signal.CONTINUES,
                        cards.unlink(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpCardRef.id(cards, caller, params), McpParams.integer(params, "expectedVersion", 0),
                                LinkType.valueOf(McpParams.requiredString(params, "type").toUpperCase(Locale.ROOT)),
                                McpParams.requiredString(params, "target"), caller.actor()))));

        list.add(new McpOperation<>("cards.comment",
                "Adds a comment to a card (by key or id). With `parentId` (a comment id of the same card) it is a "
                        + "reply to that comment, which may itself be a reply.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string(), "text",
                        McpSchemas.string(), "parentId", McpSchemas.string()), List.of("projectId", "cardId", "text")),
                Map.of("projectId", EX_PROJECT, "cardId", "OFF-12", "text", "Status update"),
                (caller, params) -> {
                    var comment = comments.add(caller.accountId(), McpParams.uuid(params, "projectId"),
                            McpParams.requiredString(params, "cardId"), McpParams.requiredString(params, "text"),
                            McpParams.optionalUuid(params, "parentId"), caller.actor());
                    agentWork.continues(McpParams.uuid(params, "projectId"), comment.cardId(), caller.actor());
                    return comment;
                }));

        list.add(new McpOperation<>("cards.logTime", "Logs hours against a card for a given date.", WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string(), "date",
                        McpSchemas.string(), "hours", McpSchemas.number(), "who", McpSchemas.string(), "note",
                        McpSchemas.string()), List.of("projectId", "cardId", "date", "hours")),
                Map.of("projectId", EX_PROJECT, "cardId", "OFF-12", "date", "2026-09-14", "hours", 2.5),
                (caller, params) -> {
                    var entry = time.add(caller.accountId(), McpParams.uuid(params, "projectId"),
                            McpParams.requiredString(params, "cardId"),
                            java.time.LocalDate.parse(McpParams.requiredString(params, "date")),
                            McpParams.number(params, "hours", 0.0), McpParams.string(params, "who", null),
                            McpParams.string(params, "note", null), caller.actor());
                    agentWork.continues(McpParams.uuid(params, "projectId"), entry.cardId(), caller.actor());
                    return entry;
                }));

        list.add(new McpOperation<>("cards.delete", "Soft-deletes a card.", WRITE, SCOPE_WRITE,
                McpSchemas.schema(
                        Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer()),
                        List.of("projectId", "cardId", "expectedVersion")),
                Map.of("projectId", EX_PROJECT, "cardId", EX_CARD, "expectedVersion", 1),
                (caller, params) -> {
                    cards.delete(caller.accountId(), McpParams.uuid(params, "projectId"),
                            McpCardRef.id(cards, caller, params),
                            McpParams.integer(params, "expectedVersion", 0), caller.actor());
                    return Map.of("deleted", true);
                }));

        list.add(new McpOperation<>("cards.requestHuman",
                "Hands work to a person AS A CARD (never a comment) when you hit a wall an agent can't get past. "
                        + "All four blocks are required: `why` this needs a human, the `steps` to follow, what "
                        + "\"`doneWhen`\" looks like, and which cards this `unblocks` once done. The rendered card "
                        + "is `executor: human` and blocks every card listed in `unblocks`. Pass its `category` "
                        + "(meta.states' `categoryGuide`): a wall is a card like any other. Pass a `form` (see "
                        + "cards.attachForm) and the person answers by filling it: the wall is born with it, and "
                        + "its answers come back on the card's `form`. Without one, `why` or `steps` needs a "
                        + "`No form: <reason>` line (`contract_unmet`). A review creates no cards: a "
                        + "session reviewing the card it names in `workingOn` is refused (`review_creates_no_cards`).",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(requestHumanProperties(),
                        List.of("projectId", "title", "why", "steps", "doneWhen")),
                Map.of("projectId", EX_PROJECT, "title", "Decide on X", "why", "Needs a human judgment call",
                        "steps", "Read the doc, then decide", "doneWhen", "Decision written down", "unblocks",
                        List.of()),
                (caller, params) -> {
                    UUID projectId = McpParams.uuid(params, "projectId");
                    McpWallGate.require(agentWork, caller, projectId, params);
                    CardService.RequestHuman wall = new CardService.RequestHuman(
                            McpParams.requiredString(params, "title"), McpParams.requiredString(params, "why"),
                            McpParams.requiredString(params, "steps"), McpParams.requiredString(params, "doneWhen"),
                            McpParams.stringArray(params, "unblocks"),
                            params.hasNonNull("assignee") ? toAssignee(params.get("assignee")) : null,
                            category(params));
                    if (!params.hasNonNull("form")) {
                        return cards.requestHuman(caller.accountId(), projectId, wall, caller.actor());
                    }
                    CardView created = cardForms.requestHuman(caller.accountId(), projectId, wall,
                            McpCardForms.toFormSpec(params.get("form")), caller.actor());
                    return details.get(caller.accountId(), projectId, created.key());
                }));

        list.add(new McpOperation<>("cards.attachForm",
                "Gives a `human` card the Quaestio form its person answers (the card keeps its definition: why, steps, "
                        + "done when; its goal becomes completing the form), or replaces the questions of the one it "
                        + "has while nobody has answered it. It is checked before saving (Quaestio's structure "
                        + "validator and authoring lint): an invalid one answers `form_invalid` with each problem in "
                        + "words and its question id; fix it, call again (forms.lint checks a draft without a card). "
                        + "Rules: doc://contracts/quaestio-form-authoring (one decision per question, the kind that "
                        + "follows the answer, never a secret, at most 10 questions). Every CHOICE or MULTI_CHOICE "
                        + "with no \"Other\" of its own gets one, plus a free-text `<id>__other` asked only of whoever "
                        + "picks it: don't add either. When the assignee completes it the card moves to Ready, and "
                        + "cards.get returns the answers in `form.answers` (questionId, prompt, value), every earlier "
                        + "one in `form.history`. A card sent back to To do takes a new answer.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(McpCardForms.attachFormProperties(), List.of("projectId", "keyOrId", "questions")),
                Map.of("projectId", EX_PROJECT, "keyOrId", "OFF-12", "questions", List.of(Map.of("id", "region",
                        "kind", "TEXT", "prompt", "Which region hosts it?", "required", true))),
                (caller, params) -> cardForms.attach(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "keyOrId"), McpCardForms.toFormSpec(params))));

        // JDB-235, JAVA-1657: the backlog's import and export twins live in their own class.
        list.addAll(McpBacklogOperations.operations(backlog));

        // JDB-242: no REST twin by nature -- a browser is not a machine (contract §7, the one declared
        // exception to "one service layer, both adapters").
        list.add(new McpOperation<>("files.connect",
                "Makes the machine you are working on the project's file host. People attach files to cards from "
                        + "the web; the bytes never go to Javadaba's servers, they come to this machine and are "
                        + "served back from it. Call this when you start working on a project, then run the "
                        + "returned `command` in the background from the project's root directory and keep it "
                        + "running while you work. Files land under `.officium/attachments/<CARD-KEY>/` (add that "
                        + "folder to .gitignore); an attachment's `path` is relative to that folder. If you cannot "
                        + "run a background command, tell the person files cannot be hosted from here.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> machines.connect(caller.accountId(), McpParams.uuid(params, "projectId"),
                        caller.actor())));

        list.add(new McpOperation<>("usage.get",
                "How much of the free 15 MB of card data your own projects use (JDB-241): titles, descriptions, "
                        + "tags, comments, time notes and attachment names. Attached files do not count. A write "
                        + "past the limit answers `storage_quota_exceeded`.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of(), List.of()),
                Map.of(),
                (caller, params) -> quota.usageOf(caller.accountId())));

        addSprintOperations(list, sprints, cards, agentWork);

        list.addAll(McpMetrics.operations(metrics));

        McpOrganization.addOrganizationOperations(list, organization);
        list.addAll(McpDocs.operations(docs, docSearch, docSchema, docTree));
        list.addAll(McpChangelog.operations(changelog));
        McpTestHistory.addTestHistoryOperations(list, testHistory);
        list.add(McpDocHistory.importCode(docImports));
        list.addAll(McpGithub.operations(github));
        McpSessionQueue.addOperations(list, sessionQueue);
        list.addAll(McpHeartbeat.operations(heartbeat));
        list.addAll(McpCardRequests.operations(cardRequests));
        list.addAll(McpAttention.operations(attention));
        list.addAll(McpDocHistory.operations(docHistory, docPresence));
        list.addAll(McpDocLifecycle.operations(docs, docLifecycle, docMoves, docStars, docFiles));
        list.addAll(McpDocComments.operations(docComments));
        list.addAll(McpProfiles.operations(profiles));
        list.addAll(McpAutoloop.operations(autoloops));
        list.add(McpProjectLifecycle.delete(projects));
        return McpCardAnswers.shortened(list);
    }

    /** JAVA-53 (contract §8.2): the backlog is planned from here as much as from the web. */
    private static void addSprintOperations(List<McpOperation<OfficiumCaller>> list, SprintService sprints,
            CardService cards,
            AgentWorkService agentWork) {
        list.add(new McpOperation<>("sprints.list",
                "A project's sprints: the active one first, then the planned ones in order, then the closed ones "
                        + "newest first, each with its card count, unfinished count and estimate. `state` narrows "
                        + "to planned|active|closed.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "state",
                        McpSchemas.stringEnum("planned", "active", "closed")), List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> {
                    String state = McpParams.string(params, "state", null);
                    return sprints.list(caller.accountId(), McpParams.uuid(params, "projectId"),
                            state == null ? null : SprintState.fromWire(state));
                }));

        list.add(new McpOperation<>("sprints.create",
                "Plans a new sprint (state `planned`). The name defaults to \"<KEY> Sprint <n>\"; dates are "
                        + "yyyy-mm-dd. Put cards in it with cards.setSprint.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "name", McpSchemas.string(), "goal",
                        McpSchemas.string(), "startDate", McpSchemas.string(), "endDate", McpSchemas.string()),
                        List.of("projectId")),
                Map.of("projectId", EX_PROJECT, "goal", "Ship the backlog view"),
                (caller, params) -> sprints.create(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.string(params, "name", null), McpParams.string(params, "goal", null),
                        date(params, "startDate"), date(params, "endDate"), caller.actor())));

        list.add(new McpOperation<>("sprints.update",
                "Edits a sprint's name, goal or planned dates, or moves a planned sprint to `order` among the "
                        + "planned ones. `expectedVersion` works as on cards.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(
                        Map.of("projectId", McpSchemas.string(), "sprintId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer(), "name", McpSchemas.string(), "goal", McpSchemas.string(),
                                "startDate",
                                McpSchemas.string(), "endDate", McpSchemas.string(), "order", McpSchemas.integer()),
                        List.of("projectId", "sprintId", "expectedVersion")),
                Map.of("projectId", EX_PROJECT, "sprintId", EX_CARD, "expectedVersion", 1, "goal", "New goal"),
                (caller, params) -> sprints.update(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.uuid(params, "sprintId"), McpParams.integer(params, "expectedVersion", 0),
                        McpParams.string(params, "name", null), McpParams.string(params, "goal", null),
                        date(params, "startDate"), date(params, "endDate"), McpParams.integer(params, "order", null),
                        caller.actor())));

        list.add(new McpOperation<>("sprints.start",
                "Starts a planned sprint. Only one sprint is active at a time (`sprint_already_active`): while it "
                        + "is, the board shows only its cards and cards.next picks only from it.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(
                        Map.of("projectId", McpSchemas.string(), "sprintId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer(), "startDate", McpSchemas.string(), "endDate", McpSchemas.string()),
                        List.of("projectId", "sprintId", "expectedVersion")),
                Map.of("projectId", EX_PROJECT, "sprintId", EX_CARD, "expectedVersion", 1, "endDate", "2026-10-08"),
                (caller, params) -> sprints.start(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.uuid(params, "sprintId"), McpParams.integer(params, "expectedVersion", 0),
                        date(params, "startDate"), date(params, "endDate"), caller.actor())));

        list.add(new McpOperation<>("sprints.complete",
                "Closes the active sprint. `moveOpenCardsTo` is required: \"backlog\" or a planned sprint's id -- "
                        + "where its unfinished cards (not deploy/done) go. Answers the closed sprint and the keys "
                        + "it moved.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(
                        Map.of("projectId", McpSchemas.string(), "sprintId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer(), "moveOpenCardsTo", McpSchemas.string()),
                        List.of("projectId", "sprintId", "expectedVersion", "moveOpenCardsTo")),
                Map.of("projectId", EX_PROJECT, "sprintId", EX_CARD, "expectedVersion", 2, "moveOpenCardsTo",
                        "backlog"),
                (caller, params) -> sprints.complete(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.uuid(params, "sprintId"), McpParams.integer(params, "expectedVersion", 0),
                        McpParams.requiredString(params, "moveOpenCardsTo"), caller.actor())));

        list.add(new McpOperation<>("sprints.delete",
                "Deletes a planned sprint; its cards go back to the backlog.", WRITE, SCOPE_WRITE,
                McpSchemas.schema(
                        Map.of("projectId", McpSchemas.string(), "sprintId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer()),
                        List.of("projectId", "sprintId", "expectedVersion")),
                Map.of("projectId", EX_PROJECT, "sprintId", EX_CARD, "expectedVersion", 1),
                (caller, params) -> {
                    sprints.delete(caller.accountId(), McpParams.uuid(params, "projectId"),
                            McpParams.uuid(params, "sprintId"),
                            McpParams.integer(params, "expectedVersion", 0), caller.actor());
                    return Map.of("deleted", true);
                }));

        list.add(McpCardPlanning.operation(cards, agentWork));
    }

    // ── shared schema fragments ─────────────────────────────────────────────────────────────

    static Map<String, Object> newCardProperties(boolean withBatch) {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("projectId", McpSchemas.string());
        props.put("title", McpSchemas.string());
        props.put("description", McpSchemas.string());
        props.put("actionPlan", McpSchemas.string());
        props.put("status", statusEnum());
        props.put("priority", priorityEnum());
        props.put("executor", executorEnum());
        props.put("category", categoryEnum());
        props.put("estimate", McpSchemas.number());
        props.put("epic", McpSchemas.string());
        props.put("tags", McpSchemas.array(McpSchemas.string()));
        props.put("assignees", McpSchemas.array(assigneeSchema()));
        props.put("related", McpSchemas.array(McpSchemas.string()));
        props.put("blocks", McpSchemas.array(McpSchemas.string()));
        props.put("clientKey", McpSchemas.string());
        props.put("sprintId", McpSchemas.string());
        props.put("signals", McpSchemas.array(signalEnum()));
        props.put("subtype", subtypeEnum());
        props.put("form", McpCardForms.formSchema());
        if (withBatch) {
            props.put("cards",
                    McpSchemas.array(McpSchemas.objectOf(Map.of("title", McpSchemas.string()), List.of("title"))));
        }
        return props;
    }

    private static Map<String, Object> cardEditProperties() {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("projectId", McpSchemas.string());
        props.put("cardId", McpSchemas.string());
        props.put("expectedVersion", McpSchemas.integer());
        props.put("title", McpSchemas.string());
        props.put("description", McpSchemas.string());
        props.put("actionPlan", McpSchemas.string());
        props.put("priority", priorityEnum());
        // "" is how an edit takes a category away, so it is the one value the create schema lacks.
        props.put("category", McpSchemas.stringEnum(Stream.concat(Stream.of(""), wires(Category.values(),
                Category::wire).stream()).toArray(String[]::new)));
        props.put("estimate", McpSchemas.number());
        props.put("epic", McpSchemas.string());
        props.put("tags", McpSchemas.array(McpSchemas.string()));
        props.put("assignees", McpSchemas.array(assigneeSchema()));
        props.put("signals", McpSchemas.array(signalEnum()));
        props.put("subtype", subtypeEnum());
        return props;
    }

    private static Map<String, Object> linkProperties() {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("projectId", McpSchemas.string());
        props.put("cardId", McpSchemas.string());
        props.put("expectedVersion", McpSchemas.integer());
        props.put("type", McpSchemas.stringEnum("related", "blocks"));
        props.put("target", McpSchemas.string());
        return props;
    }

    private static Map<String, Object> requestHumanProperties() {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("projectId", McpSchemas.string());
        props.put("title", McpSchemas.string());
        props.put("why", McpSchemas.string());
        props.put("steps", McpSchemas.string());
        props.put("doneWhen", McpSchemas.string());
        props.put("unblocks", McpSchemas.array(McpSchemas.string()));
        props.put("assignee", assigneeSchema());
        props.put("category", categoryEnum());
        props.put("form", McpCardForms.formSchema());
        props.put("workingOn", McpSchemas.string());
        return props;
    }

    private static Map<String, Object> assigneeSchema() {
        return McpSchemas.objectOf(Map.of("accountId", McpSchemas.string(), "name", McpSchemas.string()),
                List.of("name"));
    }

    // ── param -> domain mapping shared by create/batch/requestHuman ───────────────────────────

    static CardService.NewCard toNewCard(JsonNode item) {
        return new CardService.NewCard(McpParams.requiredString(item, "title"),
                McpParams.string(item, "description", null),
                McpParams.string(item, "actionPlan", null), status(item), priority(item), executor(item),
                category(item),
                McpParams.number(item, "estimate", null),
                McpParams.string(item, "epic", null), McpParams.stringArray(item, "tags"), assignees(item),
                McpParams.stringArray(item, "related"), McpParams.stringArray(item, "blocks"),
                McpParams.string(item, "clientKey", null), McpParams.optionalUuid(item, "sprintId"),
                Signal.fromWire(McpParams.stringArray(item, "signals")),
                item.hasNonNull("subtype") ? SpikeSubtype.fromWire(McpParams.string(item, "subtype", null)) : null);
    }

    static java.time.LocalDate date(JsonNode params, String field) {
        String raw = McpParams.string(params, field, null);
        if (raw == null) {
            return null;
        }
        try {
            return java.time.LocalDate.parse(raw);
        } catch (java.time.format.DateTimeParseException ex) {
            throw McpToolException.invalid(field + " must be yyyy-mm-dd", "/" + field);
        }
    }

    static java.time.Instant instant(String raw) {
        try {
            return java.time.OffsetDateTime.parse(raw).toInstant();
        } catch (java.time.format.DateTimeParseException ex) {
            throw McpToolException.invalid("mergedAt must be an ISO-8601 instant, like 2026-09-27T16:30:00Z",
                    "/mergedAt");
        }
    }

    static Assignee toAssignee(JsonNode node) {
        String accountId = McpParams.string(node, "accountId", null);
        return new Assignee(accountId == null ? null : UUID.fromString(accountId), McpParams.requiredString(node,
                "name"));
    }

    private static List<Assignee> assignees(JsonNode params) {
        List<Assignee> result = new ArrayList<>();
        if (params.hasNonNull("assignees")) {
            for (JsonNode item : params.get("assignees")) {
                result.add(toAssignee(item));
            }
        }
        return result;
    }

    static Status status(JsonNode params) {
        String raw = McpParams.string(params, "status", null);
        return raw == null ? null : Status.fromWire(raw);
    }

    static Priority priority(JsonNode params) {
        String raw = McpParams.string(params, "priority", null);
        return raw == null ? null : Priority.fromWire(raw);
    }

    static Executor executor(JsonNode params) {
        String raw = McpParams.string(params, "executor", null);
        return raw == null ? null : Executor.fromWire(raw);
    }

    static Category category(JsonNode params) {
        String raw = McpParams.string(params, "category", null);
        return raw == null ? null : Category.fromWire(raw);
    }

    static RejectionReason rejection(JsonNode params) {
        String raw = McpParams.string(params, "rejection", null);
        return raw == null ? null : RejectionReason.fromWire(raw);
    }

    static Signal signal(JsonNode params) {
        String raw = McpParams.string(params, "signal", null);
        return raw == null ? null : Signal.fromWire(raw);
    }

    static CardSearchCriteria.Sort sort(JsonNode params) {
        String raw = McpParams.string(params, "sort", null);
        return raw == null
                ? CardSearchCriteria.Sort.ORDER
                : CardSearchCriteria.Sort.valueOf(raw.toUpperCase(Locale.ROOT));
    }

    /** JAVA-44: an agent's write also says whether it is working the card (`AgentWorkService#follow`). */
    static CardView following(AgentWorkService agentWork, JsonNode params, Actor actor,
            AgentWorkService.Signal signal, CardView card) {
        agentWork.follow(McpParams.uuid(params, "projectId"), card, actor, signal);
        return card;
    }
}
