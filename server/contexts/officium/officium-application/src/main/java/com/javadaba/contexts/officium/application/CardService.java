package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Assignee;
import com.javadaba.contexts.officium.domain.BlocksCycleDetector;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardChanges;
import com.javadaba.contexts.officium.domain.CardKeys;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.CategoryContracts;
import com.javadaba.contexts.officium.domain.EpicChildren;
import com.javadaba.contexts.officium.domain.EpicStatus;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.SpikeSubtype;
import com.javadaba.contexts.officium.domain.CardLink;
import com.javadaba.contexts.officium.domain.CardRejection;
import com.javadaba.contexts.officium.domain.CardRules;
import com.javadaba.contexts.officium.domain.CardSearchCriteria;
import com.javadaba.contexts.officium.domain.RejectionRules;
import com.javadaba.contexts.officium.domain.ReviewReturns;
import com.javadaba.contexts.officium.domain.RejectionReason;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.LinkType;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Page;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.RunState;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.StorageUsage;
import com.javadaba.contexts.officium.domain.ports.AccountDirectory;
import com.javadaba.contexts.officium.domain.ports.ActivityRepository;
import com.javadaba.contexts.officium.domain.ports.CardBatchWriter;
import com.javadaba.contexts.officium.domain.ports.CardCommentRepository;
import com.javadaba.contexts.officium.domain.ports.CardFormRepository;
import com.javadaba.contexts.officium.domain.ports.CardRequestRepository;
import com.javadaba.contexts.officium.domain.ports.CardLinkRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.PrecedenceRepository;
import com.javadaba.contexts.officium.domain.ports.ProjectRepository;
import com.javadaba.contexts.officium.domain.ports.SearchIndexPort;
import com.javadaba.contexts.officium.domain.ports.SprintRepository;
import com.javadaba.contexts.officium.domain.DeliveryFlow;
import com.javadaba.contexts.officium.domain.jql.JqlContext;
import com.javadaba.contexts.officium.domain.jql.JqlCardFacts;
import com.javadaba.contexts.officium.domain.jql.JqlEvaluator;
import com.javadaba.contexts.officium.domain.jql.JqlParser;
import com.javadaba.contexts.officium.domain.jql.JqlQuery;
import com.javadaba.contexts.officium.domain.jql.JqlTextHint;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * The card CRUD/move/link/executor surface (JDB-216). Every mutating method takes an {@link Actor}
 * so an MCP adapter (JDB-220/221, not built here) can call it exactly as REST does (contract §1.1).
 */
@ApplicationScoped
public class CardService {

    private static final java.util.logging.Logger LOG = java.util.logging.Logger
            .getLogger(CardService.class.getName());

    private static final int MAX_BATCH = 50;

    private final CardRepository cards;
    private final CardLinkRepository links;
    private final CardBatchWriter batchWriter;
    private final ProjectRepository projects;
    private final ProjectAccessGuard guard;
    private final AccountDirectory directory;
    private final ActivityPublisher activity;
    private final StorageQuotaService quota;
    private final SearchIndexPort searchIndex;
    private final SprintRepository sprints;
    private final RoleMatrixService roleMatrices;
    private final ActivityRepository activityLog;
    private final CardCommentRepository comments;
    private final CardFormRepository cardForms;
    private final CardRequestRepository requests;
    private final CardViewAssembler viewAssembler;
    private final EpicFollower epics;
    private final ReviewExitWriter reviewExits;
    private final LineageRecorder lineage;
    private final SprintPlacement placement;
    private final CardPrecedence precedence;
    /** Whether a card may be moved to rejected yet (card://JAVA-1415): off until a later deploy turns it on. */
    private final boolean rejectionEnabled;
    private final Clock clock;

    /**
     * {@code Instance<SearchIndexPort>} and not a direct constructor parameter on purpose: the two
     * adapters (Postgres, RoaringBitmap) are {@code @LookupIfProperty}-gated CDI beans, both still
     * present in the bean archive -- a plain {@code @Inject SearchIndexPort} fails ArC validation
     * with {@code AmbiguousResolutionException} because typesafe resolution sees both. Programmatic
     * lookup via {@link Instance#get()} is what actually applies the {@code
     * officium.search.provider} condition and returns the one active bean (same pattern {@code
     * SearchBenchmarkService} used before it was retired in favor of this being the real path).
     */
    @Inject
    public CardService(CardRepository cards, CardLinkRepository links, CardBatchWriter batchWriter,
            ProjectRepository projects, ProjectAccessGuard guard, AccountDirectory directory,
            ActivityPublisher activity, StorageQuotaService quota, Instance<SearchIndexPort> searchIndex,
            SprintRepository sprints, RoleMatrixService roleMatrices, ActivityRepository activityLog,
            CardCommentRepository comments, CardFormRepository cardForms, CardRequestRepository requests,
            CardViewAssembler viewAssembler, QualityLedger quality, PrecedenceRepository precedence,
            @ConfigProperty(name = "javadaba.officium.rejection.enabled", defaultValue = "false") boolean rejectionEnabled) {
        this(cards, links, batchWriter, projects, guard, directory, activity, quota, resolve(searchIndex), sprints,
                roleMatrices, activityLog, comments, cardForms, requests, viewAssembler, quality, precedence,
                rejectionEnabled, Clock.systemUTC());
    }

    CardService(CardRepository cards, CardLinkRepository links, CardBatchWriter batchWriter,
            ProjectRepository projects, ProjectAccessGuard guard, AccountDirectory directory,
            ActivityPublisher activity, StorageQuotaService quota, SearchIndexPort searchIndex,
            SprintRepository sprints, RoleMatrixService roleMatrices, ActivityRepository activityLog,
            CardCommentRepository comments, CardFormRepository cardForms, CardRequestRepository requests,
            CardViewAssembler viewAssembler, QualityLedger quality, PrecedenceRepository precedence,
            boolean rejectionEnabled, Clock clock) {
        this.lineage = new LineageRecorder(cards, links, quality.escapedDefects(), activity);
        this.epics = new EpicFollower(cards, activity, this::reindexSafely, clock);
        this.rejectionEnabled = rejectionEnabled;
        this.requests = requests;
        this.viewAssembler = viewAssembler;
        this.cards = cards;
        this.links = links;
        this.batchWriter = batchWriter;
        this.projects = projects;
        this.guard = guard;
        this.directory = directory;
        this.activity = activity;
        this.quota = quota;
        this.searchIndex = searchIndex;
        this.sprints = sprints;
        this.roleMatrices = roleMatrices;
        this.activityLog = activityLog;
        this.comments = comments;
        this.cardForms = cardForms;
        this.reviewExits = new ReviewExitWriter(new SendBackWriter(cards, activity, roleMatrices, quota,
                this::reindexSafely), quality.reviewOutcomes(), quality.phaseRuns(), roleMatrices,
                viewAssembler::returnsOf, cards);
        this.placement = new SprintPlacement(cards, sprints, activity, clock);
        this.precedence = new CardPrecedence(precedence, cards, sprints, placement, activity, clock);
        this.clock = clock;
    }

    private static SearchIndexPort resolve(Instance<SearchIndexPort> searchIndex) {
        if (searchIndex.isUnsatisfied()) {
            throw new IllegalStateException(
                    "officium.search.provider must be one of postgres|roaring (no adapter matched)");
        }
        return searchIndex.get();
    }

    /** The card's own text, as the storage quota counts it (JDB-241). */
    private static long textBytes(String title, String description, String actionPlan, String epic,
            List<String> tags) {
        return StorageUsage.bytesOf(title, description, actionPlan, epic) + StorageUsage.bytesOf(tags);
    }

    private static long textBytes(Card card) {
        return textBytes(card.title(), card.description(), card.actionPlan(), card.epic(), card.tags());
    }

    // ── create ──────────────────────────────────────────────────────────────────────────────

    public CardView create(UUID accountId, UUID projectId, NewCard request, Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        if (request.clientKey() != null && !request.clientKey().isBlank()) {
            Optional<Card> existing = cards.findByClientKey(projectId, request.clientKey());
            if (existing.isPresent()) {
                return buildView(existing.get());
            }
        }
        Card created = insertCard(access.project(), request, actor);
        linkNewCard(access.project().id(), created, request.related(), request.blocks());
        recordCreated(access.project().id(), created, actor);
        reindexSafely(created);
        if (EpicFollower.shapesAnEpic(created)) {
            epics.follow(access.project().id(), actor);
        }
        return buildView(cards.findById(access.project().id(), created.id()).orElse(created));
    }

    /**
     * Same rules as {@link #create}, run over the whole list before touching a repository (JDB-247):
     * quota is checked against a running total simulating each card's not-yet-persisted bytes piling
     * on top of the owner's live usage -- exactly what re-reading the live usage after each single
     * insert used to show -- and a column's {@code order} is likewise a running count seeded once per
     * status instead of one {@code columnOrder} read per card. Only the actual card/link rows move
     * from "one round trip per card" to one batched write for the whole list.
     */
    public List<CardView> createBatch(UUID accountId, UUID projectId, List<NewCard> requests, Actor actor) {
        if (requests == null || requests.isEmpty()) {
            throw OfficiumException.badRequest("cards_required", "At least one card is required");
        }
        if (requests.size() > MAX_BATCH) {
            throw OfficiumException.badRequest("batch_too_large", "At most " + MAX_BATCH + " cards per batch");
        }
        ProjectAccessGuard.Access access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Project project = access.project();
        // Microseconds: what a timestamptz keeps, so the views built from memory below say exactly
        // what a read-back would.
        Instant now = Instant.now(clock).truncatedTo(ChronoUnit.MICROS);

        List<BatchSlot> slots = new ArrayList<>(requests.size());
        Map<String, Card> byClientKeyInBatch = new HashMap<>();
        Map<String, Card> byKeyInBatch = new HashMap<>();
        Map<Status, Integer> nextOrderByStatus = new HashMap<>();
        Map<Optional<UUID>, Integer> nextRankBySprint = new HashMap<>();
        CardPrecedence.Ranking ranking = precedence.rankingOf(project.id());
        StorageUsage runningUsage = null;
        for (NewCard request : requests) {
            String clientKey = request.clientKey();
            if (clientKey != null && !clientKey.isBlank()) {
                Card existing = byClientKeyInBatch.get(clientKey);
                if (existing == null) {
                    existing = cards.findByClientKey(projectId, clientKey).orElse(null);
                    if (existing != null) {
                        byClientKeyInBatch.put(clientKey, existing);
                    }
                }
                if (existing != null) {
                    slots.add(new BatchSlot(existing, false, List.of(), List.of(), null));
                    continue;
                }
            }
            if (request.title() == null || request.title().isBlank()) {
                throw OfficiumException.badRequest("title_required", "A card needs a title");
            }
            CardRules.requirePlannable(request.category(), request.sprintId());
            CardRules.requireSubtypeFits(request.category(), request.subtype());
            Executor executor = request.executor() == null ? Executor.AI : request.executor();
            List<Assignee> assignees = request.assignees() == null ? List.of() : request.assignees();
            if (executor == Executor.HUMAN && assignees.isEmpty()) {
                assignees = List.of(ownerAssignee(project));
            }
            CardRules.requireAssignee(executor, assignees);
            long bytes = textBytes(request.title(), request.description(), request.actionPlan(), request.epic(),
                    request.tags());
            if (bytes > 0) {
                if (runningUsage == null) {
                    runningUsage = quota.usageOf(project.ownerAccountId());
                }
                quota.requireRoom(project, runningUsage, bytes);
                runningUsage = new StorageUsage(runningUsage.usedBytes() + bytes, runningUsage.limitBytes());
            }
            Status status = request.status() == null
                    ? CategoryContracts.defaultStatus(request.category(), request.description())
                    : request.status();
            RejectionRules.requireNotBornRejected(status);
            CategoryContracts.requireEntry(actor.kind(), executor, request.category(), null, status,
                    request.description());
            lineage.require(project.id(), null, executor, request.category(), request.description(), null, status,
                    actor);
            int number = projects.allocateCardNumber(project.id());
            String key = CardKeys.format(project.keyPrefix(), number);
            int order = nextOrderByStatus.computeIfAbsent(status, s -> cards.columnOrder(project.id(), s).size());
            nextOrderByStatus.put(status, order + 1);
            CardPrecedence.Outcome outcome = precedence.onCreate(ranking, project.id(), request.category(),
                    request.epic(), request.tags(), request.signals(), request.priority(),
                    requireOpenSprint(project.id(), request.sprintId()));
            Priority priority = outcome.priority();
            UUID sprintId = outcome.sprintId();
            int rank = nextRankBySprint.computeIfAbsent(Optional.ofNullable(sprintId),
                    s -> cards.sprintOrder(project.id(), sprintId).size());
            nextRankBySprint.put(Optional.ofNullable(sprintId), rank + 1);
            Card card = new Card(UUID.randomUUID(), project.id(), key, number, request.title().strip(),
                    request.description(), request.actionPlan(), status, RunState.IDLE, priority, executor,
                    request.category(), order, request.estimate() == null ? 0 : request.estimate(), request.epic(),
                    request.tags(), assignees, 1, now, now, actor, actor, null, clientKey, null, sprintId, rank,
                    request.signals(), request.subtype());
            if (clientKey != null && !clientKey.isBlank()) {
                byClientKeyInBatch.put(clientKey, card);
            }
            byKeyInBatch.put(card.key(), card);
            slots.add(new BatchSlot(card, true, orEmpty(request.related()), orEmpty(request.blocks()), outcome));
        }

        List<Card> newCards = new ArrayList<>();
        List<CardLink> newLinks = new ArrayList<>();
        List<CardLink> blocksEdgesSoFar = null;
        for (BatchSlot slot : slots) {
            if (!slot.created()) {
                continue;
            }
            Card created = slot.card();
            newCards.add(created);
            for (String key : slot.related()) {
                Card target = resolveLinkTarget(projectId, key, byKeyInBatch);
                newLinks.add(new CardLink(UUID.randomUUID(), projectId, LinkType.RELATED, created.id(), target.id(),
                        created.key(), target.key()));
            }
            for (String key : slot.blocks()) {
                Card target = resolveLinkTarget(projectId, key, byKeyInBatch);
                if (blocksEdgesSoFar == null) {
                    blocksEdgesSoFar = new ArrayList<>(links.findAllBlocksEdges(projectId));
                }
                if (BlocksCycleDetector.wouldCreateCycle(blocksEdgesSoFar, created.id(), target.id())) {
                    throw OfficiumException.conflict("blocks_cycle", "That would close a cycle of blocking cards");
                }
                CardLink link = new CardLink(UUID.randomUUID(), projectId, LinkType.BLOCKS, created.id(),
                        target.id(), created.key(), target.key());
                newLinks.add(link);
                blocksEdgesSoFar.add(link);
            }
        }

        requireEpicsMovable(projectId, newCards);
        batchWriter.insertAll(newCards, List.of(), List.of(), newLinks);
        reindexBatchSafely(newCards);
        boolean epicsFollowed = newCards.stream().anyMatch(EpicFollower::shapesAnEpic);
        if (epicsFollowed) {
            epics.follow(projectId, actor);
        }

        // The views of the cards just written come from what is in memory, not from reading each one
        // back (JAVA-1: that was three queries per card). Nothing in a view exists only after the
        // insert: every column is set here (timestamps included, truncated to what Postgres keeps),
        // and a new card's links can only be the ones this batch created.
        Map<UUID, Status> newStatuses = new HashMap<>();
        newCards.forEach(card -> newStatuses.put(card.id(), card.status()));
        List<CardView> result = new ArrayList<>(slots.size());
        RoleMatrix matrix = roleMatrices.effective(project.id());
        for (BatchSlot slot : slots) {
            if (slot.created()) {
                recordCreated(project.id(), slot.card(), actor);
                precedence.recordCreated(slot.card(), slot.outcome(), actor, now);
                // An epic of this batch may have just followed its children: that one is read back.
                result.add(epicsFollowed && slot.card().category() == Category.EPIC
                        ? buildView(requireCard(projectId, slot.card().id().toString()), matrix)
                        : viewAssembler.viewOfNewCard(slot.card(), newLinks, newStatuses, matrix, ranking));
            } else {
                result.add(buildView(slot.card(), matrix));
            }
        }
        return result;
    }

    private Card resolveLinkTarget(UUID projectId, String key, Map<String, Card> byKeyInBatch) {
        Card inBatch = byKeyInBatch.get(key);
        return inBatch != null ? inBatch : requireCard(projectId, key);
    }

    /** One row of {@link #createBatch}'s in-memory pass: either a card already found by its
     *  {@code clientKey} (nothing to link/persist), or a freshly built one still needing its
     *  {@code related}/{@code blocks} resolved before the batched write. */
    private record BatchSlot(Card card, boolean created, List<String> related, List<String> blocks,
            CardPrecedence.Outcome outcome) {
    }

    /** {@code cards.requestHuman} -- a wall an agent hit, handed to a person AS A CARD, never a
     *  comment (harness precedent). Body is rendered from the four blocks. */
    public CardView requestHuman(UUID accountId, UUID projectId, RequestHuman request, Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Project project = access.project();
        List<Assignee> assignees = request.assignee() != null
                ? List.of(request.assignee())
                : List.of(ownerAssignee(project));
        NewCard newCard = new NewCard(request.title(), WallBody.render(request), null, Status.TODO,
                Priority.HIGH, Executor.HUMAN, request.category(), 0.0, null, List.of(), assignees, List.of(),
                request.unblocks(),
                null);
        Card created = insertCard(project, newCard, actor);
        linkNewCard(project.id(), created, List.of(), request.unblocks());
        recordCreated(project.id(), created, actor);
        reindexSafely(created);
        return buildView(cards.findById(project.id(), created.id()).orElse(created));
    }

    private Card insertCard(Project project, NewCard request, Actor actor) {
        if (request.title() == null || request.title().isBlank()) {
            throw OfficiumException.badRequest("title_required", "A card needs a title");
        }
        CardRules.requirePlannable(request.category(), request.sprintId());
        CardRules.requireSubtypeFits(request.category(), request.subtype());
        Executor executor = request.executor() == null ? Executor.AI : request.executor();
        List<Assignee> assignees = request.assignees() == null ? List.of() : request.assignees();
        if (executor == Executor.HUMAN && assignees.isEmpty()) {
            assignees = List.of(ownerAssignee(project));
        }
        CardRules.requireAssignee(executor, assignees);
        quota.requireRoom(project, textBytes(request.title(), request.description(), request.actionPlan(),
                request.epic(), request.tags()));
        Status status = request.status() == null
                ? CategoryContracts.defaultStatus(request.category(), request.description())
                : request.status();
        RejectionRules.requireNotBornRejected(status);
        CategoryContracts.requireEntry(actor.kind(), executor, request.category(), null, status,
                request.description());
        lineage.require(project.id(), null, executor, request.category(), request.description(), null, status, actor);
        int number = projects.allocateCardNumber(project.id());
        String key = CardKeys.format(project.keyPrefix(), number);
        int order = cards.columnOrder(project.id(), status).size();
        CardPrecedence.Outcome outcome = precedence.onCreate(precedence.rankingOf(project.id()), project.id(),
                request.category(), request.epic(), request.tags(), request.signals(), request.priority(),
                requireOpenSprint(project.id(), request.sprintId()));
        Priority priority = outcome.priority();
        UUID sprintId = outcome.sprintId();
        int rank = cards.sprintOrder(project.id(), sprintId).size();
        Instant now = Instant.now(clock);
        Card card = new Card(UUID.randomUUID(), project.id(), key, number, request.title().strip(),
                request.description(), request.actionPlan(), status, RunState.IDLE, priority, executor,
                request.category(), order, request.estimate() == null ? 0 : request.estimate(), request.epic(),
                request.tags(), assignees, 1, now, now, actor, actor, null, request.clientKey(), null, sprintId, rank,
                request.signals(), request.subtype());
        requireEpicsMovable(project.id(), List.of(card));
        Card inserted = cards.insert(card);
        precedence.recordCreated(inserted, outcome, actor, now);
        return inserted;
    }

    /**
     * An epic born outside {@code refine} already needs a child (JAVA-292), the same as one moved out
     * of it; the cards being created count, so a batch may bring an epic and its children together.
     */
    private void requireEpicsMovable(UUID projectId, List<Card> newCards) {
        List<Card> epics = newCards.stream()
                .filter(c -> c.category() == Category.EPIC && c.status() != Status.REFINE).toList();
        if (epics.isEmpty()) {
            return;
        }
        List<Card> project = new ArrayList<>(cards.findAllByProject(projectId));
        project.addAll(newCards);
        for (Card epic : epics) {
            CardRules.requireMovable(epic.category(), EpicChildren.count(epic.key(), project), epic.status());
        }
    }

    /** The statuses of the cards that belong to this epic ({@link EpicChildren}); null for any other card. */
    public List<Status> epicChildren(UUID projectId, CardView card) {
        if (!Category.EPIC.wire().equals(card.category())) {
            return null;
        }
        return EpicChildren.byEpic(cards.findAllByProject(projectId)).getOrDefault(card.key(), List.of()).stream()
                .map(Card::status).toList();
    }

    /** A card is planned into a sprint that exists and hasn't closed; {@code null} is the backlog. */
    private UUID requireOpenSprint(UUID projectId, UUID sprintId) {
        if (sprintId == null) {
            return null;
        }
        sprints.findById(projectId, sprintId)
                .orElseThrow(() -> OfficiumException.notFound("sprint_not_found", "No such sprint"))
                .requireOpen();
        return sprintId;
    }

    private void linkNewCard(UUID projectId, Card created, List<String> related, List<String> blocks) {
        for (String key : orEmpty(related)) {
            Card target = requireCard(projectId, key);
            this.links.insert(new CardLink(UUID.randomUUID(), projectId, LinkType.RELATED, created.id(),
                    target.id(), created.key(), target.key()));
        }
        for (String key : orEmpty(blocks)) {
            Card target = requireCard(projectId, key);
            List<CardLink> existing = this.links.findAllBlocksEdges(projectId);
            if (BlocksCycleDetector.wouldCreateCycle(existing, created.id(), target.id())) {
                throw OfficiumException.conflict("blocks_cycle", "That would close a cycle of blocking cards");
            }
            this.links.insert(new CardLink(UUID.randomUUID(), projectId, LinkType.BLOCKS, created.id(),
                    target.id(), created.key(), target.key()));
        }
    }

    private static List<String> orEmpty(List<String> list) {
        return list == null ? List.of() : list;
    }

    private void recordCreated(UUID projectId, Card created, Actor actor) {
        activity.record(projectId, created.id(), created.key(), actor, "card.created",
                "Card \"" + created.title() + "\" created", created.createdAt());
        activity.publish("card.created", projectId, created.id(), created.key(), created.version(), actor,
                created.createdAt());
        lineage.record(created, null, actor, created.createdAt());
    }

    private Assignee ownerAssignee(Project project) {
        Optional<AccountDirectory.Found> found = directory.findByAccountId(project.ownerAccountId());
        String name = found.map(AccountDirectory.Found::name).filter(n -> !n.isBlank())
                .or(() -> found.map(AccountDirectory.Found::email).filter(e -> !e.isBlank()))
                .orElse("Owner");
        return new Assignee(project.ownerAccountId(), name);
    }

    // ── read ────────────────────────────────────────────────────────────────────────────────

    /** Just the card, view-shaped -- the REST resource composes {@code CardDetailView} on top of
     *  this by also calling {@code CardCommentService}/{@code CardTimeService}/
     *  {@code CardAttachmentService}: those are independent aggregates, so {@code CardService}
     *  doesn't need to know about them to answer "what's this card". */
    public CardView get(UUID accountId, UUID projectId, String keyOrId) {
        guard.requireAccess(projectId, accountId);
        return buildView(requireCard(projectId, keyOrId));
    }

    /** Resolves a {@code keyOrId} to its {@code UUID}, checking project access first -- what the
     *  other per-card services (comments, time, attachments) need before touching a card id they
     *  received from the URL. */
    public UUID resolveCardId(UUID accountId, UUID projectId, String keyOrId) {
        guard.requireAccess(projectId, accountId);
        return requireCard(projectId, keyOrId).id();
    }

    private Card requireCard(UUID projectId, String keyOrId) {
        Optional<Card> found = CardKeys.looksLikeKey(keyOrId)
                ? cards.findByKey(projectId, keyOrId)
                : findByIdOrKey(projectId, keyOrId);
        return found.filter(c -> !c.deleted())
                .orElseThrow(() -> OfficiumException.notFound("card_not_found", "No such card"));
    }

    private Optional<Card> findByIdOrKey(UUID projectId, String keyOrId) {
        try {
            return cards.findById(projectId, UUID.fromString(keyOrId));
        } catch (IllegalArgumentException ex) {
            return cards.findByKey(projectId, keyOrId);
        }
    }

    public Page<CardView> search(UUID accountId, UUID projectId, SearchRequest request) {
        guard.requireAccess(projectId, accountId);
        CardSearchCriteria criteria = new CardSearchCriteria(request.text(), request.status(), request.priority(),
                request.epic(), request.tag(), resolveAssignee(request.assigneeRaw(), accountId), request.executor(),
                request.category(), request.blocked(), request.humanEditPending(),
                resolveSprint(projectId, request.sprintRaw()), request.sort(), request.cursor(), request.limit(),
                request.signal(), request.rejection());
        Page<Card> page = request.role() == null || request.role().isBlank()
                ? searchIndex.search(projectId, criteria)
                : CardRoleSearch.search(searchIndex, roleMatrices.effective(projectId), projectId, criteria,
                        request.role(), cards);
        return new Page<>(views(projectId, page.items()), page.nextCursor());
    }

    private static final int MAX_JQL_CANDIDATES = 20_000;

    /**
     * OQL over the project's cards (JDB-270): the same grammar, functions and error wording as
     * the search view's client-side {@code jql.ts} -- both now run the SAME parser/evaluator
     * ({@code officium-domain}'s {@code jql} package), which REST ({@code ?jql=}) and MCP
     * ({@code cards.search}'s {@code jql} param) call through here. A parse error throws {@code
     * JqlInvalidException} ({@code OfficiumExceptionMapper} turns it into {@code 400
     * {error:"jql_invalid", message, at}}, the same message and character offset the browser
     * showed). Candidates are narrowed through {@link SearchIndexPort} when the query has a
     * top-level {@code text}/{@code summary}/{@code description} {@code ~} clause -- the same
     * narrowing {@link #search} itself uses -- and read whole from the repository otherwise
     * (same as the backlog export); the full predicate, sort and paging then run in memory,
     * exactly what the browser did before this card, just on the server and over one query
     * instead of every card the view loaded.
     */
    public Page<CardView> searchByJql(UUID accountId, UUID projectId, String jql, String cursor, int limit) {
        guard.requireAccess(projectId, accountId);
        JqlQuery query = JqlParser.parse(jql == null ? "" : jql);
        List<Card> candidates = jqlCandidates(projectId, query.where());
        JqlContext ctx = new JqlContext(accountId, Instant.now(clock));
        JqlCardFacts facts = new ProjectJqlFacts(this::isBlocked, () -> viewAssembler.returnsByCard(projectId));
        List<Card> matched = candidates.stream()
                .filter(c -> !c.deleted())
                .filter(c -> JqlEvaluator.matches(c, query.where(), ctx, facts))
                .toList();
        List<Card> sorted = JqlEvaluator.sort(matched, query.orderBy());
        return paginateJql(projectId, sorted, cursor, limit <= 0 ? 50 : limit);
    }

    private boolean isBlocked(Card card) {
        return CardRules.isBlocked(cards.blockerStatuses(card.id()));
    }

    private List<Card> jqlCandidates(UUID projectId, com.javadaba.contexts.officium.domain.jql.JqlNode where) {
        String textHint = JqlTextHint.extract(where);
        if (textHint == null) {
            return cards.findAllByProject(projectId);
        }
        CardSearchCriteria narrowing = new CardSearchCriteria(textHint, null, null, null, null, null, null, null,
                null, null, null, CardSearchCriteria.Sort.ORDER, null, MAX_JQL_CANDIDATES);
        return searchIndex.search(projectId, narrowing).items();
    }

    private Page<CardView> paginateJql(UUID projectId, List<Card> sorted, String cursor, int limit) {
        Page<Card> page = OffsetPaging.window(sorted, cursor, limit);
        return new Page<>(views(projectId, page.items()), page.nextCursor());
    }

    private CardSearchCriteria.SprintFilter resolveSprint(UUID projectId, String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return switch (raw) {
            case "backlog" -> CardSearchCriteria.SprintFilter.BACKLOG;
            case "active" -> sprints.findActive(projectId).map(s -> CardSearchCriteria.SprintFilter.of(s.id()))
                    .orElse(CardSearchCriteria.SprintFilter.NONE);
            default -> {
                try {
                    yield CardSearchCriteria.SprintFilter.of(UUID.fromString(raw));
                } catch (IllegalArgumentException ex) {
                    throw OfficiumException.badRequest("invalid_sprint",
                            "sprint is a sprint id, \"active\" or \"backlog\"");
                }
            }
        };
    }

    /**
     * Plans the card into {@code sprintId} (null = the backlog) at {@code position} there (JAVA-53).
     * Like {@link #move}: the card's version is checked, both groups stay dense, and it isn't a
     * content edit -- planning never turns into a human edit an agent has to acknowledge.
     */
    public CardView setSprint(UUID accountId, UUID projectId, UUID cardId, int expectedVersion, UUID sprintId,
            int position, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Card current = requireCard(projectId, cardId.toString());
        if (current.version() != expectedVersion) {
            throw new CardVersionConflictException(buildView(current));
        }
        CardRules.requirePlannable(current.category(), sprintId);
        UUID target = requireOpenSprint(projectId, sprintId);
        Card planned = placement.plan(projectId, current, target, position, actor, "card.sprint",
                "Planned into " + placement.sprintName(projectId, target))
                .orElseThrow(
                        () -> new CardVersionConflictException(buildView(requireCard(projectId, cardId.toString()))));
        reindexSafely(planned);
        return buildView(planned);
    }

    /** For {@code SprintService}: cards it sent elsewhere in bulk, so the search index follows. */
    void reindexAll(UUID projectId, List<UUID> cardIds) {
        for (UUID id : cardIds) {
            cards.findById(projectId, id).ifPresent(this::reindexSafely);
        }
    }

    private CardSearchCriteria.AssigneeFilter resolveAssignee(String raw, UUID accountId) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        if ("me".equals(raw)) {
            return new CardSearchCriteria.AssigneeFilter(accountId, null);
        }
        try {
            return new CardSearchCriteria.AssigneeFilter(UUID.fromString(raw), null);
        } catch (IllegalArgumentException ex) {
            return new CardSearchCriteria.AssigneeFilter(null, raw);
        }
    }

    public com.javadaba.contexts.officium.domain.ProjectFacets facets(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return cards.facets(projectId);
    }

    /**
     * What a board holding a copy needs to catch up (JAVA-45): everything it shows when {@code since}
     * is null, otherwise what changed after it. Read back {@link #CHANGES_OVERLAP} earlier than asked:
     * a write stamped just before {@code asOf} can commit just after the read, and sending a card
     * twice costs nothing while missing one leaves the board wrong until the next change to it.
     */
    public CardChangesView changes(UUID accountId, UUID projectId, Instant since) {
        guard.requireAccess(projectId, accountId);
        CardChanges changes = cards.changedSince(projectId, since == null ? null : since.minus(CHANGES_OVERLAP));
        return new CardChangesView(changes.asOf(), viewAssembler.changeViews(projectId, changes.cards()),
                changes.removed());
    }

    static final Duration CHANGES_OVERLAP = Duration.ofMinutes(1);

    public record CardChangesView(Instant asOf,
            @com.fasterxml.jackson.annotation.JsonIgnoreProperties( {
                    "description", "actionPlan"}) List<CardView> cards,
            List<UUID> removed){
    }

    /** {@code cards.next}; {@code skip} is who is being worked right now, which only
     *  {@link AgentWorkService#next} knows. */
    public Optional<CardView> next(UUID accountId, UUID projectId, Set<UUID> skip, boolean beyondSprint) {
        guard.requireAccess(projectId, accountId);
        return new ReviewReworkPicker(cards, viewAssembler).next(projectId, skip, beyondSprint).map(this::buildView);
    }

    public List<CardView> needsHuman(UUID accountId, UUID projectId, String assigneeRaw) {
        guard.requireAccess(projectId, accountId);
        UUID assigneeAccountId = "me".equals(assigneeRaw) ? accountId : null;
        return views(projectId, cards.needsHuman(projectId, assigneeAccountId));
    }

    // ── update ──────────────────────────────────────────────────────────────────────────────

    /**
     * A save that changes nothing the card says is not a write (user request, 2026-09-23): no new
     * version, no history entry, no event, and never a human edit. It answers the card as it is,
     * even against a stale {@code expectedVersion} -- there is nothing of the caller's to lose, so a
     * conflict dialog over it would be noise.
     */
    public CardView update(UUID accountId, UUID projectId, UUID cardId, int expectedVersion, CardEdit edit,
            Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Card current = requireCard(projectId, cardId.toString());
        List<Assignee> assignees = edit.assignees() != null ? edit.assignees() : current.assignees();
        if (edit.assignees() != null) {
            CardRules.requireAssignee(current.executor(), assignees);
        }
        Card edited = CardEdits.applied(current, edit, assignees);
        if (edited.title().isBlank()) {
            throw OfficiumException.badRequest("title_required", "A card needs a title");
        }
        if (edit.subtype() != null) {
            CardRules.requireSubtypeFits(edited.category(), SpikeSubtype.fromWire(edit.subtype()));
        }
        if (edited.sameContentAs(current)) {
            return buildView(current);
        }
        EditContracts.require(actor.kind(), current, edited, cards);
        Card desired = edited.editedBy(actor, Instant.now(clock));
        CardPrecedence.Outcome outcome = precedence.onEdit(access.project().id(), current, desired,
                edit.priority() != null);
        desired = desired.withPriority(outcome.priority());
        quota.requireRoom(access.project(), textBytes(desired) - textBytes(current));
        applyVersioned(access.project().id(), current, desired, expectedVersion, actor, "card.updated", "Card updated");
        Card latest = desired;
        if ((!Objects.equals(current.epic(), desired.epic()) || current.category() != desired.category())
                && (EpicFollower.shapesAnEpic(current) || EpicFollower.shapesAnEpic(desired))) {
            epics.follow(access.project().id(), actor);
            // A card that just became an epic may have followed its children: read it back.
            latest = requireCard(projectId, cardId.toString());
        }
        Card settled = precedence.afterEdit(access.project().id(), latest, outcome, actor);
        if (settled != latest) {
            reindexSafely(settled);
        }
        return settled.category() == Category.EPIC && settled.sprintId() != null
                ? unplanEpic(access.project().id(), settled, actor)
                : buildView(settled);
    }

    /**
     * A card that became an epic leaves its sprint in the same call, to the end of the backlog, and
     * its history says why (JAVA-290): a sprint holds an epic's children, never the epic.
     */
    private CardView unplanEpic(UUID projectId, Card epic, Actor actor) {
        Card unplanned = placement.unplanEpic(projectId, epic, actor)
                .orElseThrow(() -> new CardVersionConflictException(
                        buildView(requireCard(projectId, epic.id().toString()))));
        reindexSafely(unplanned);
        return buildView(unplanned);
    }

    /**
     * An agent has read what a person changed on this card ({@code cards.acknowledgeHumanEdit}):
     * the card stops answering {@code humanEditPending}. Not versioned -- it changes nothing the
     * card says (see {@link CardRepository#markHumanEditReviewed}) -- but it is recorded, so the
     * person can see the agent took note, and published, so open boards drop the marker.
     */
    public CardView acknowledgeHumanEdit(UUID accountId, UUID projectId, String keyOrId, Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Card current = requireCard(projectId, keyOrId);
        if (!current.humanEditPending()) {
            return buildView(current);
        }
        Instant now = Instant.now(clock);
        if (!cards.markHumanEditReviewed(access.project().id(), current.id(), now)) {
            return buildView(requireCard(projectId, keyOrId));
        }
        Card reviewed = current.withHumanEdit(current.humanEdit().reviewed(now));
        activity.record(access.project().id(), reviewed.id(), reviewed.key(), actor, "card.reviewed",
                "Reviewed " + current.humanEdit().editedBy().name() + "'s changes", now);
        activity.publish("card.updated", access.project().id(), reviewed.id(), reviewed.key(), reviewed.version(),
                actor, now);
        reindexSafely(reviewed);
        return buildView(reviewed);
    }

    public CardView move(UUID accountId, UUID projectId, UUID cardId, int expectedVersion, Status newStatus,
            int position, Actor actor) {
        return move(accountId, projectId, cardId, expectedVersion, newStatus, position, null, actor);
    }

    /** Whether a card may be moved to rejected yet: {@code meta.states} tells clients (card://JAVA-1415). */
    public boolean rejectionEnabled() {
        return rejectionEnabled;
    }

    /**
     * A move, and with {@code rejection} the reason a move to rejected carries (card://JAVA-1415): it is
     * stored on the card and recorded in its history; a move out of rejected clears it.
     */
    public CardView move(UUID accountId, UUID projectId, UUID cardId, int expectedVersion, Status newStatus,
            int position, RejectionRules.Request rejection, Actor actor) {
        return move(accountId, projectId, cardId, expectedVersion, newStatus, position, rejection, null, actor);
    }

    /**
     * {@link #move} with the {@code reviewReturn} a send-back from review or deploy carries (card://JAVA-1416): its
     * reasons and findings are written with the move, as the card's log entry and a comment.
     */
    public CardView move(UUID accountId, UUID projectId, UUID cardId, int expectedVersion, Status newStatus,
            int position, RejectionRules.Request rejection, ReviewReturns.Request reviewReturn, Actor actor) {
        return move(accountId, projectId, cardId, expectedVersion, newStatus, position, rejection, reviewReturn, null,
                null, actor);
    }

    /**
     * {@link #move} with the review exit's engineering quality (card://JAVA-1526): a send-back's
     * {@code reviewReturn.ruleViolations}, or an approval's {@code qualityScorecard} (each reviewed dimension's
     * score, {@code observations}, {@code role}). Every exit from review is logged on the card. {@code role} is the
     * one the mover ran the phase it leaves as, kept with the phase run (card://JAVA-1527).
     */
    public CardView move(UUID accountId, UUID projectId, UUID cardId, int expectedVersion, Status newStatus,
            int position, RejectionRules.Request rejection, ReviewReturns.Request reviewReturn,
            Map<String, String> qualityScorecard, String role, Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Card current = requireCard(projectId, cardId.toString());
        if (current.version() != expectedVersion) {
            throw new CardVersionConflictException(buildView(current));
        }
        CardRejection rejected = RejectionRules.require(current, newStatus, rejection, rejectionEnabled,
                key -> findByIdOrKey(projectId, key).filter(card -> !card.deleted())).orElse(null);
        if (current.category() == Category.EPIC && current.status() != newStatus) {
            EpicStatus.requireManualMove(current, cards.findAllByProject(projectId), newStatus);
        }
        Instant now = Instant.now(clock);
        ReviewExitWriter.Prepared exit = reviewExits.prepare(access.project(), current, newStatus, reviewReturn,
                qualityScorecard, role, actor, now);
        newStatus = exit.landing().to();
        if (current.status() != newStatus) {
            TransitionContracts.of(current, cards, links, comments, viewAssembler)
                    .require(current, newStatus, actor, access.project().definitionOfDone());
            lineage.require(projectId, current.key(), current.executor(), current.category(), current.description(),
                    current.status(), newStatus, actor);
        }
        MoveOrders orders = MoveOrders.of(cards, projectId, current.status(), newStatus, cardId, position);
        boolean ok = cards.moveIfVersion(projectId, cardId, expectedVersion, newStatus, orders.source(), orders.dest(),
                now, rejected, exit.sendBack());
        if (!ok) {
            throw new CardVersionConflictException(buildView(requireCard(projectId, cardId.toString())));
        }
        Card moved = requireCard(projectId, cardId.toString());
        activity.record(projectId, moved.id(), moved.key(), actor, "card.moved",
                DeliveryFlow.MOVED_TO + newStatus.wire(), now);
        if (rejection != null) {
            activity.record(projectId, moved.id(), moved.key(), actor, "card.rejected",
                    "Rejected as " + rejected.reason().label().toLowerCase(java.util.Locale.ROOT)
                            + (rejected.cardId() == null
                                    ? ""
                                    : ", naming " + requireCard(projectId,
                                            rejected.cardId().toString()).key()),
                    now);
        }
        activity.publish("card.moved", projectId, moved.id(), moved.key(), moved.version(), actor, now);
        moved = reviewExits.record(current, moved, exit, actor, now);
        lineage.record(moved, current.status(), actor, now);
        // move() doesn't go through applyVersioned (its version check is inside cards.moveIfVersion
        // instead), so it needs its own reindex call -- status and order are both search/sort
        // criteria over the index's cached Card (see the note in applyVersioned).
        reindexSafely(moved);
        if (current.status() != newStatus && EpicFollower.shapesAnEpic(moved)) {
            epics.follow(projectId, actor);
        }
        return buildView(moved);
    }

    // ── a spike's time box (JAVA-878) ────────────────────────────────────────────────────────

    /** An agent's spike in progress whose time box has ended, and who owns its project. */
    public record ExpiredSpike(UUID projectId, UUID ownerAccountId, UUID cardId, String key, int version,
            Instant endsAt, Duration timeBox) {
    }

    /**
     * Every agent's spike in progress, in any project, whose time box ended by now
     * ({@link CategoryContracts#timeBoxEndsAt}). A spike in To do, a {@code human} one and one whose time box does
     * not parse have no box running, so they are never listed.
     */
    public List<ExpiredSpike> expiredSpikes() {
        Instant now = Instant.now(clock);
        List<ExpiredSpike> expired = new ArrayList<>();
        Map<UUID, Optional<Project>> projectsById = new HashMap<>();
        for (Card spike : cards.findLive(Category.SPIKE, Status.DOING)) {
            Optional<Instant> endsAt = CategoryContracts.timeBoxEndsAt(spike, () -> viewAssembler.movesOf(spike));
            if (endsAt.isEmpty() || now.isBefore(endsAt.get())) {
                continue;
            }
            projectsById.computeIfAbsent(spike.projectId(), projects::findById).ifPresent(project -> expired.add(
                    new ExpiredSpike(project.id(), project.ownerAccountId(), spike.id(), spike.key(), spike.version(),
                            endsAt.get(), CategoryContracts.timeBox(spike.description()).orElseThrow())));
        }
        return expired;
    }

    /**
     * Delivers an expired spike to Ready, as {@code actor}, through the same move a person or an agent makes: the
     * Ready phase is the delivery analyst's, who checks it against the exit contract. Empty when the card changed
     * since it was listed (a version conflict): the next sweep reads it again.
     */
    public Optional<CardView> deliverExpiredSpike(ExpiredSpike spike, Actor actor) {
        try {
            return Optional.of(move(spike.ownerAccountId(), spike.projectId(), spike.cardId(), spike.version(),
                    Status.READY, 0, actor));
        } catch (CardVersionConflictException changed) {
            return Optional.empty();
        }
    }

    public CardView setRunState(UUID accountId, UUID projectId, UUID cardId, int expectedVersion,
            RunState runState, Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Card current = requireCard(projectId, cardId.toString());
        TransitionContracts.requireRun(current, runState, actor);
        Instant now = Instant.now(clock);
        Card desired = withRunState(current, runState, actor, now);
        return applyVersioned(access.project().id(), current, desired, expectedVersion, actor, "card.updated",
                "Run state set to " + runState.wire());
    }

    public CardView setExecutor(UUID accountId, UUID projectId, UUID cardId, int expectedVersion,
            Executor executor, Assignee providedAssignee, Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Card current = requireCard(projectId, cardId.toString());
        List<Assignee> assignees = current.assignees();
        if (executor == Executor.HUMAN) {
            if (providedAssignee != null) {
                assignees = List.of(providedAssignee);
            } else if (assignees.isEmpty()) {
                assignees = List.of(ownerAssignee(access.project()));
            }
            CardRules.requireAssignee(Executor.HUMAN, assignees);
        }
        RunState runState = executor == Executor.HUMAN ? RunState.IDLE : current.runState();
        Instant now = Instant.now(clock);
        Card desired = new Card(current.id(), current.projectId(), current.key(), current.number(),
                current.title(), current.description(), current.actionPlan(), current.status(), runState,
                current.priority(), executor, current.category(), current.order(), current.estimate(),
                current.epic(), current.tags(), assignees, current.version() + 1, current.createdAt(), now,
                current.createdBy(), actor, null, current.clientKey(), current.humanEdit(), current.sprintId(),
                current.rank(), current.signals(), current.subtype());
        return applyVersioned(access.project().id(), current, desired, expectedVersion, actor, "card.executor",
                "Executor set to " + executor.wire());
    }

    private Card withRunState(Card card, RunState runState, Actor actor, Instant now) {
        return new Card(card.id(), card.projectId(), card.key(), card.number(), card.title(), card.description(),
                card.actionPlan(), card.status(), runState, card.priority(), card.executor(), card.category(),
                card.order(), card.estimate(), card.epic(), card.tags(), card.assignees(), card.version() + 1,
                card.createdAt(), now, card.createdBy(), actor, null, card.clientKey(), card.humanEdit(),
                card.sprintId(), card.rank(), card.signals(), card.subtype());
    }

    public CardView link(UUID accountId, UUID projectId, UUID cardId, int expectedVersion, LinkType type,
            String targetKey, Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Card current = requireCard(projectId, cardId.toString());
        Card target = requireCard(projectId, targetKey);
        if (type == LinkType.BLOCKS) {
            List<CardLink> existing = links.findAllBlocksEdges(projectId);
            if (BlocksCycleDetector.wouldCreateCycle(existing, current.id(), target.id())) {
                throw OfficiumException.conflict("blocks_cycle", "That would close a cycle of blocking cards");
            }
        }
        links.insert(new CardLink(UUID.randomUUID(), projectId, type, current.id(), target.id(), current.key(),
                target.key()));
        return bumpVersionAfterLinkChange(access.project().id(), current, expectedVersion, actor,
                type == LinkType.RELATED ? "card.link" : "card.link",
                (type == LinkType.RELATED ? "Related to " : "Now blocks ") + target.key());
    }

    public CardView unlink(UUID accountId, UUID projectId, UUID cardId, int expectedVersion, LinkType type,
            String targetKey, Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Card current = requireCard(projectId, cardId.toString());
        Card target = requireCard(projectId, targetKey);
        links.delete(projectId, current.id(), type, target.id());
        return bumpVersionAfterLinkChange(access.project().id(), current, expectedVersion, actor, "card.link",
                (type == LinkType.RELATED ? "No longer related to " : "No longer blocks ") + target.key());
    }

    private CardView bumpVersionAfterLinkChange(UUID projectId, Card current, int expectedVersion, Actor actor,
            String operation, String summary) {
        Card desired = current.touched(actor, Instant.now(clock));
        return applyVersioned(projectId, current, desired, expectedVersion, actor, operation, summary);
    }

    public void delete(UUID accountId, UUID projectId, UUID cardId, int expectedVersion, Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        Card current = requireCard(projectId, cardId.toString());
        if (current.version() != expectedVersion) {
            throw new CardVersionConflictException(buildView(current));
        }
        Instant now = Instant.now(clock);
        boolean ok = cards.deleteIfVersion(projectId, cardId, expectedVersion, now, actor);
        if (!ok) {
            throw new CardVersionConflictException(buildView(requireCard(projectId, cardId.toString())));
        }
        links.deleteAllForCard(cardId);
        requests.closeForCard(cardId, now);
        activity.record(access.project().id(), cardId, current.key(), actor, "card.deleted",
                "Card \"" + current.title() + "\" deleted", now);
        activity.publish("card.deleted", access.project().id(), cardId, current.key(), current.version() + 1, actor,
                now);
        if (EpicFollower.shapesAnEpic(current)) {
            epics.follow(access.project().id(), actor);
        }
        CardIndexRemoval.remove(searchIndex, cardId);
    }

    private CardView applyVersioned(UUID projectId, Card current, Card desired, int expectedVersion, Actor actor,
            String operation, String summary) {
        if (current.version() != expectedVersion) {
            throw new CardVersionConflictException(buildView(current));
        }
        boolean ok = cards.updateIfVersion(desired, expectedVersion);
        if (!ok) {
            throw new CardVersionConflictException(buildView(requireCard(projectId, current.id().toString())));
        }
        activity.record(projectId, desired.id(), desired.key(), actor, operation, summary, desired.updatedAt());
        activity.publish(operation, projectId, desired.id(), desired.key(), desired.version(), actor,
                desired.updatedAt());
        // Every versioned mutation goes through here (update/setRunState/setExecutor) -- reindexing
        // once, centrally, is what stops move()'s sibling methods from silently drifting the way
        // update() alone used to (status/executor/order are searched/sorted on by
        // InMemoryCardSearch over the index's own cached Card, not re-read from the DB per query).
        reindexSafely(desired);
        return buildView(desired);
    }

    /** An index failure can't turn an already-committed write into a client-visible error -- the
     *  card is correctly saved either way, and the index's own hourly reconciliation will pick up
     *  whatever this call missed (same discipline as curriculum's {@code indexWritten}). */
    private void reindexSafely(Card card) {
        try {
            searchIndex.indexUpsert(card);
        } catch (RuntimeException notIndexed) {
            LOG.log(java.util.logging.Level.WARNING, "Card " + card.id() + " written but the search index was not"
                    + " updated", notIndexed);
        }
    }

    /**
     * For the sibling services that touch a card outside {@link #applyVersioned} (comments, time,
     * attachments): the index caches the whole card, and {@code humanEditPending} and the
     * {@code updated} sort are read from that cache, so it must follow those writes too.
     */
    void reindex(Card card) {
        reindexSafely(card);
    }

    /** Same discipline as {@link #reindexSafely(Card)}, batched -- used by {@link #createBatch}. */
    private void reindexBatchSafely(List<Card> cardsToIndex) {
        try {
            searchIndex.indexUpsertBatch(cardsToIndex);
        } catch (RuntimeException notIndexed) {
            LOG.log(java.util.logging.Level.WARNING,
                    cardsToIndex.size() + " card(s) written but the search index was not updated", notIndexed);
        }
    }

    CardView buildView(Card card) {
        return viewAssembler.view(card);
    }

    private CardView buildView(Card card, RoleMatrix matrix) {
        return viewAssembler.view(card, matrix);
    }

    private List<CardView> views(UUID projectId, List<Card> list) {
        return viewAssembler.views(projectId, list);
    }

    // ── request shapes ──────────────────────────────────────────────────────────────────────

    /** {@code sprintId} null = the backlog (contract §8.2). */
    public record NewCard(String title, String description, String actionPlan, Status status, Priority priority,
            Executor executor, Category category, Double estimate, String epic, List<String> tags,
            List<Assignee> assignees, List<String> related, List<String> blocks, String clientKey, UUID sprintId,
            List<Signal> signals, SpikeSubtype subtype) {

        public NewCard(String title, String description, String actionPlan, Status status, Priority priority,
                Executor executor, Category category, Double estimate, String epic, List<String> tags,
                List<Assignee> assignees, List<String> related, List<String> blocks, String clientKey,
                UUID sprintId, List<Signal> signals) {
            this(title, description, actionPlan, status, priority, executor, category, estimate, epic, tags, assignees,
                    related, blocks, clientKey, sprintId, signals, null);
        }

        public NewCard(String title, String description, String actionPlan, Status status, Priority priority,
                Executor executor, Category category, Double estimate, String epic, List<String> tags,
                List<Assignee> assignees, List<String> related, List<String> blocks, String clientKey,
                UUID sprintId) {
            this(title, description, actionPlan, status, priority, executor, category, estimate, epic, tags, assignees,
                    related, blocks, clientKey, sprintId, List.of());
        }

        public NewCard(String title, String description, String actionPlan, Status status, Priority priority,
                Executor executor, Category category, Double estimate, String epic, List<String> tags,
                List<Assignee> assignees, List<String> related, List<String> blocks, String clientKey) {
            this(title, description, actionPlan, status, priority, executor, category, estimate, epic, tags, assignees,
                    related, blocks, clientKey, null);
        }
    }

    /**
     * Partial update -- {@code null} means "leave unchanged"; an empty list or string clears the field.
     * {@code category} travels as its wire value for that reason: {@code ""} is how a caller says
     * "no category", which a {@link Category} can't. {@code signals} travel as wire values too, so an
     * unknown one is the caller's {@code 400 invalid_signal}, and so does a spike's {@code subtype}
     * ({@code 400 invalid_subtype}).
     */
    public record CardEdit(String title, String description, String actionPlan, Priority priority, String category,
            Double estimate, String epic, List<String> tags, List<Assignee> assignees, List<String> signals,
            String subtype) {

        public CardEdit(String title, String description, String actionPlan, Priority priority, String category,
                Double estimate, String epic, List<String> tags, List<Assignee> assignees, List<String> signals) {
            this(title, description, actionPlan, priority, category, estimate, epic, tags, assignees, signals, null);
        }

        public CardEdit(String title, String description, String actionPlan, Priority priority, String category,
                Double estimate, String epic, List<String> tags, List<Assignee> assignees) {
            this(title, description, actionPlan, priority, category, estimate, epic, tags, assignees, null);
        }
    }

    /** {@code category} may be null, but a wall is classified like any card (JAVA-373). */
    public record RequestHuman(String title, String why, String steps, String doneWhen, List<String> unblocks,
            Assignee assignee, Category category) {
    }

    /** {@code sprintRaw}: a sprint id, {@code "active"} or {@code "backlog"}; null for no filter. */
    public record SearchRequest(String text, Status status, Priority priority, String epic, String tag,
            String assigneeRaw, Executor executor, Category category, Boolean blocked, Boolean humanEditPending,
            CardSearchCriteria.Sort sort, String cursor, int limit, String sprintRaw, Signal signal,
            /** Only the cards rejected for this reason (card://JAVA-1415); null for any. */
            RejectionReason rejection,
            /** Only the cards one role may take (its id as a card's eligibleRoles lists it); null for any. */
            String role) {

        public SearchRequest(String text, Status status, Priority priority, String epic, String tag,
                String assigneeRaw, Executor executor, Category category, Boolean blocked, Boolean humanEditPending,
                CardSearchCriteria.Sort sort, String cursor, int limit, String sprintRaw, Signal signal,
                RejectionReason rejection) {
            this(text, status, priority, epic, tag, assigneeRaw, executor, category, blocked, humanEditPending, sort,
                    cursor, limit, sprintRaw, signal, rejection, null);
        }

        public SearchRequest(String text, Status status, Priority priority, String epic, String tag,
                String assigneeRaw, Executor executor, Category category, Boolean blocked, Boolean humanEditPending,
                CardSearchCriteria.Sort sort, String cursor, int limit, String sprintRaw, Signal signal) {
            this(text, status, priority, epic, tag, assigneeRaw, executor, category, blocked, humanEditPending, sort,
                    cursor, limit, sprintRaw, signal, null);
        }

        public SearchRequest(String text, Status status, Priority priority, String epic, String tag,
                String assigneeRaw, Executor executor, Category category, Boolean blocked, Boolean humanEditPending,
                CardSearchCriteria.Sort sort, String cursor, int limit, String sprintRaw) {
            this(text, status, priority, epic, tag, assigneeRaw, executor, category, blocked, humanEditPending, sort,
                    cursor, limit, sprintRaw, null);
        }

        public SearchRequest(String text, Status status, Priority priority, String epic, String tag,
                String assigneeRaw, Executor executor, Category category, Boolean blocked, Boolean humanEditPending,
                CardSearchCriteria.Sort sort, String cursor, int limit) {
            this(text, status, priority, epic, tag, assigneeRaw, executor, category, blocked, humanEditPending, sort,
                    cursor, limit, null);
        }
    }
}
