package com.javadaba.contexts.officium.application.backlog;

import com.javadaba.contexts.officium.application.ActivityPublisher;
import com.javadaba.contexts.officium.application.ProjectAccessGuard;
import com.javadaba.contexts.officium.application.StorageQuotaService;
import com.javadaba.contexts.officium.domain.Assignee;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardAttachment;
import com.javadaba.contexts.officium.domain.CardComment;
import com.javadaba.contexts.officium.domain.CardLink;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.LinkType;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.RunState;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.StorageUsage;
import com.javadaba.contexts.officium.domain.ports.AccountDirectory;
import com.javadaba.contexts.officium.domain.ports.CardAttachmentRepository;
import com.javadaba.contexts.officium.domain.ports.CardBatchWriter;
import com.javadaba.contexts.officium.domain.ports.CardCommentRepository;
import com.javadaba.contexts.officium.domain.ports.CardLinkRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.SearchIndexPort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * `.backlog/*.md` &lt;-&gt; Officium cards (JDB-235, contract §6). Import keeps {@code task_id} as
 * the card key verbatim (a HUMAN-prefixed or otherwise non-{@code keyPrefix}-shaped key is legal:
 * Officium's own key sequence for THIS project is untouched by an import, so a card created
 * afterwards through the ordinary path cannot collide with one). Export writes the harness
 * conventions back for a {@code human} card regardless of what it was imported with, per the
 * card's own directive.
 *
 * <p>{@code target_module}/{@code target_agent} have no field in Officium's {@link Card} --
 * round-tripped as namespaced tags ({@link #TARGET_MODULE_TAG}/{@link #TARGET_AGENT_TAG}) rather
 * than growing the domain for two backlog-only concepts nothing else in Officium needs.
 */
@ApplicationScoped
public class BacklogImportExportService {

    private static final java.util.logging.Logger LOG = java.util.logging.Logger
            .getLogger(BacklogImportExportService.class.getName());

    static final String TARGET_MODULE_TAG = "backlog:target-module:";
    static final String TARGET_AGENT_TAG = "backlog:target-agent:";
    private static final Pattern TRAILING_NUMBER = Pattern.compile("-(\\d+)$");
    private static final DateTimeFormatter ISO_MILLIS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            .withZone(ZoneOffset.UTC);

    private final CardRepository cards;
    private final CardLinkRepository links;
    private final CardCommentRepository comments;
    private final CardAttachmentRepository attachments;
    private final CardBatchWriter batchWriter;
    private final AccountDirectory directory;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final StorageQuotaService quota;
    private final SearchIndexPort searchIndex;
    private final Clock clock;

    /** {@code Instance<SearchIndexPort>} for the same reason {@code CardService} uses it -- see its
     *  Javadoc: this is the OTHER write path {@code backlog.importMarkdown} (JDB-247's batch insert,
     *  bypassing {@code CardService} entirely) needs to notify so an imported card is searchable
     *  immediately instead of only after the next hourly reconciliation. */
    @Inject
    public BacklogImportExportService(CardRepository cards, CardLinkRepository links, CardCommentRepository comments,
            CardAttachmentRepository attachments, CardBatchWriter batchWriter, AccountDirectory directory,
            ProjectAccessGuard guard, ActivityPublisher activity, StorageQuotaService quota,
            Instance<SearchIndexPort> searchIndex) {
        this(cards, links, comments, attachments, batchWriter, directory, guard, activity, quota,
                resolve(searchIndex), Clock.systemUTC());
    }

    BacklogImportExportService(CardRepository cards, CardLinkRepository links, CardCommentRepository comments,
            CardAttachmentRepository attachments, CardBatchWriter batchWriter, AccountDirectory directory,
            ProjectAccessGuard guard, ActivityPublisher activity, StorageQuotaService quota,
            SearchIndexPort searchIndex, Clock clock) {
        this.cards = cards;
        this.links = links;
        this.comments = comments;
        this.attachments = attachments;
        this.batchWriter = batchWriter;
        this.directory = directory;
        this.guard = guard;
        this.activity = activity;
        this.quota = quota;
        this.searchIndex = searchIndex;
        this.clock = clock;
    }

    private static SearchIndexPort resolve(Instance<SearchIndexPort> searchIndex) {
        if (searchIndex.isUnsatisfied()) {
            throw new IllegalStateException(
                    "officium.search.provider must be one of postgres|roaring (no adapter matched)");
        }
        return searchIndex.get();
    }

    // ── import ──────────────────────────────────────────────────────────────────────────────

    public ImportResult importMarkdown(UUID accountId, UUID projectId, List<BacklogFile> files, Actor actor) {
        var access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        // The markdown as sent: a little more than what is kept (frontmatter keys), never less, so
        // an import that fits here cannot cross the allowance once stored (JDB-241).
        quota.requireRoom(access.project(),
                files.stream().mapToLong(file -> StorageUsage.bytesOf(file.content())).sum());
        List<BacklogCard> parsed = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        for (BacklogFile file : files) {
            try {
                parsed.add(BacklogMarkdown.parse(file.name(), file.content()));
            } catch (BacklogMarkdown.BacklogFormatException ex) {
                warnings.add(file.name() + ": " + ex.getMessage());
            }
        }
        Map<String, BacklogCard> byTaskId = new LinkedHashMap<>();
        for (BacklogCard raw : parsed) {
            byTaskId.put(raw.taskId(), raw);
        }

        // Every card gets its id here, client-side (JDB-247): building the whole batch in memory
        // first -- instead of inserting one card, then its comments, then its attachments, before
        // moving to the next -- needs comments/attachments/links to reference an id that doesn't
        // require the card to be in the database yet, and a client-generated UUID already is one.
        Instant now = Instant.now(clock);
        List<Card> newCards = new ArrayList<>(parsed.size());
        List<CardComment> newComments = new ArrayList<>();
        List<CardAttachment> newAttachments = new ArrayList<>();
        Map<String, UUID> idByTaskId = new HashMap<>();
        // Imported cards land in the backlog (JAVA-53), after whatever is already planned there.
        int nextRank = cards.sprintOrder(projectId, null).size();
        for (BacklogCard raw : parsed) {
            Card card = buildCard(projectId, raw, BacklogValues.categoryOf(raw, warnings),
                    BacklogValues.signalsOf(raw, warnings), actor, now, nextRank++);
            newCards.add(card);
            idByTaskId.put(raw.taskId(), card.id());
            for (BacklogCard.Comment comment : raw.comments()) {
                Instant at = parseInstant(comment.date(), now);
                Actor author = Actor.person(authorId(comment.author()), comment.author());
                newComments.add(new CardComment(UUID.randomUUID(), card.id(), author, comment.text(), at, at));
            }
            for (BacklogCard.Attachment attachment : raw.attachments()) {
                // Already the model every attachment follows (JDB-242): a path relative to the
                // project's working copy, where the file lives. Size unknown until a machine serves it.
                newAttachments.add(new CardAttachment(UUID.randomUUID(), card.id(), attachment.name(), 0,
                        "application/octet-stream", attachment.path(), now));
            }
        }
        // The card a rejection names may come later in the files: resolved once every id is known.
        newCards.replaceAll(card -> BacklogValues.rejected(card, byTaskId.get(card.key()).rejection(),
                key -> Optional.ofNullable(idByTaskId.get(key)).or(() -> cards.findByKey(projectId, key)
                        .filter(found -> !found.deleted()).map(Card::id)),
                warnings));

        List<CardLink> newLinks = new ArrayList<>();
        Set<String> processedPairs = new HashSet<>();
        for (BacklogCard raw : parsed) {
            UUID aId = idByTaskId.get(raw.taskId());
            boolean aHuman = isHuman(raw);
            for (String relatedId : raw.related()) {
                BacklogCard b = byTaskId.get(relatedId);
                UUID bId = idByTaskId.get(relatedId);
                if (b == null || bId == null) {
                    warnings.add(raw.taskId() + ": related -> unknown card " + relatedId);
                    continue;
                }
                String pairKey = pairKey(raw.taskId(), relatedId);
                if (!processedPairs.add(pairKey)) {
                    continue;
                }
                boolean bHuman = isHuman(b);
                boolean mutual = b.related().contains(raw.taskId());
                if (mutual && aHuman && !bHuman) {
                    newLinks.add(new CardLink(UUID.randomUUID(), projectId, LinkType.BLOCKS, aId, bId, raw.taskId(),
                            relatedId));
                } else if (mutual && bHuman && !aHuman) {
                    newLinks.add(new CardLink(UUID.randomUUID(), projectId, LinkType.BLOCKS, bId, aId, relatedId,
                            raw.taskId()));
                } else {
                    newLinks.add(new CardLink(UUID.randomUUID(), projectId, LinkType.RELATED, aId, bId, raw.taskId(),
                            relatedId));
                }
            }
        }

        // One transaction, cards first (JDB-247): a mid-import failure used to leave whatever cards
        // had already been inserted one row at a time in place; now either the whole backlog lands
        // or none of it does, in a handful of round trips instead of one per card/comment/
        // attachment/link.
        batchWriter.insertAll(newCards, newComments, newAttachments, newLinks);
        try {
            searchIndex.indexUpsertBatch(newCards);
        } catch (RuntimeException notIndexed) {
            LOG.log(java.util.logging.Level.WARNING,
                    newCards.size() + " imported card(s) written but the search index was not updated", notIndexed);
        }

        activity.record(projectId, null, null, actor, "backlog.imported",
                "Imported " + parsed.size() + " card(s) from .backlog/", now);
        activity.publish("project.updated", projectId, null, null, null, actor, now);
        return new ImportResult(parsed.size(), warnings);
    }

    private Card buildCard(UUID projectId, BacklogCard raw, Category category, List<Signal> signals, Actor actor,
            Instant fallbackNow, int rank) {
        if (raw.taskId() == null || raw.taskId().isBlank()) {
            throw OfficiumException.badRequest("task_id_required", "Every imported card needs a task_id");
        }
        Executor executor = isHuman(raw) ? Executor.HUMAN : Executor.AI;
        List<Assignee> assignees = raw.assignees().stream().map(name -> new Assignee(null, name)).toList();
        if (executor == Executor.HUMAN && assignees.isEmpty()) {
            assignees = List.of(new Assignee(null, "Unassigned"));
        }
        List<String> tags = new ArrayList<>(raw.tags());
        if (raw.targetModule() != null && !raw.targetModule().isBlank()) {
            tags.add(TARGET_MODULE_TAG + raw.targetModule());
        }
        if (raw.targetAgent() != null && !raw.targetAgent().isBlank()) {
            tags.add(TARGET_AGENT_TAG + raw.targetAgent());
        }
        Instant createdAt = parseInstant(raw.createdAt(), fallbackNow);
        Instant updatedAt = parseInstant(raw.updatedAt(), createdAt);
        return new Card(UUID.randomUUID(), projectId, raw.taskId(), parseNumber(raw.taskId()), raw.title(),
                raw.description(), raw.actionPlan(), Status.fromWire(raw.status()), RunState.fromWire(raw.runState()),
                Priority.fromWire(raw.priority()), executor, category, raw.order(), raw.estimate(),
                raw.epic() == null || raw.epic().isBlank() ? null : raw.epic(), tags, assignees, 1, createdAt,
                updatedAt, actor, actor, null, null, null, null, rank, signals, null);
    }

    private static boolean isHuman(BacklogCard raw) {
        return raw.taskId().toUpperCase(java.util.Locale.ROOT).startsWith("HUMAN-")
                || "HUMAN".equals(raw.epic())
                || raw.tags().contains("human");
    }

    private static int parseNumber(String taskId) {
        Matcher m = TRAILING_NUMBER.matcher(taskId);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }

    private static String pairKey(String a, String b) {
        return a.compareTo(b) <= 0 ? a + "|" + b : b + "|" + a;
    }

    private static UUID authorId(String author) {
        return UUID.nameUUIDFromBytes(("officium-backlog-import:" + author).getBytes(StandardCharsets.UTF_8));
    }

    private static Instant parseInstant(String iso, Instant fallback) {
        if (iso == null || iso.isBlank()) {
            return fallback;
        }
        try {
            return Instant.parse(iso);
        } catch (RuntimeException ex) {
            return fallback;
        }
    }

    // ── export ──────────────────────────────────────────────────────────────────────────────

    /** The whole backlog as one {@code .zip}, named from the project's key prefix and the clock (JAVA-1657). */
    public BacklogArchive exportArchive(UUID accountId, UUID projectId) {
        String prefix = guard.requireAtLeast(projectId, accountId, Role.VIEWER).project().keyPrefix();
        return new BacklogArchive(prefix + "-backlog-" + LocalDate.now(clock) + ".zip",
                BacklogArchive.zip(exportMarkdown(accountId, projectId)));
    }

    public List<BacklogFile> exportMarkdown(UUID accountId, UUID projectId) {
        guard.requireAtLeast(projectId, accountId, Role.VIEWER);
        List<BacklogFile> files = new ArrayList<>();
        for (Card card : cards.findAllByProject(projectId)) {
            files.add(new BacklogFile(card.key() + ".md", BacklogMarkdown.serialize(toBacklogCard(card))));
        }
        return files;
    }

    private BacklogCard toBacklogCard(Card card) {
        boolean human = card.executor() == Executor.HUMAN;
        List<String> tags = new ArrayList<>();
        String targetModule = "";
        String targetAgent = "";
        for (String tag : card.tags()) {
            if (tag.startsWith(TARGET_MODULE_TAG)) {
                targetModule = tag.substring(TARGET_MODULE_TAG.length());
            } else if (tag.startsWith(TARGET_AGENT_TAG)) {
                targetAgent = tag.substring(TARGET_AGENT_TAG.length());
            } else if (!human || !tag.equals("human")) {
                tags.add(tag);
            }
        }
        String epic = card.epic() == null ? "" : card.epic();
        if (human) {
            epic = "HUMAN";
            if (!tags.contains("human")) {
                tags.add(0, "human");
            }
        }

        List<CardLink> cardLinks = links.findByCard(card.id());
        List<String> related = new ArrayList<>();
        for (CardLink link : cardLinks) {
            String otherKey = link.otherKey(card.id());
            if (link.type() == LinkType.RELATED) {
                related.add(otherKey);
            } else if (human && link.sourceCardId().equals(card.id())) {
                related.add(otherKey); // this human card unblocks otherKey
            } else if (link.targetCardId().equals(card.id())) {
                related.add(otherKey); // otherKey (a human card) unblocks this one
            }
        }

        List<BacklogCard.Comment> commentList = comments.listByCard(card.id()).stream()
                .map(c -> new BacklogCard.Comment(c.author().name(), ISO_MILLIS.format(c.createdAt()), c.text()))
                .toList();
        List<BacklogCard.Attachment> attachmentList = attachments.listByCard(card.id()).stream()
                .map(a -> new BacklogCard.Attachment(a.path(), a.name()))
                .toList();

        return new BacklogCard(card.key(), targetAgent, targetModule, card.priority().wire(), card.status().wire(),
                card.runState().wire(), card.order(), card.estimate(), epic,
                card.category() == null ? "" : card.category().wire(),
                card.signals().stream().map(Signal::wire).toList(), tags,
                card.assignees().stream().map(Assignee::name).toList(), related, ISO_MILLIS.format(card.createdAt()),
                ISO_MILLIS.format(card.updatedAt()), card.title(), card.description(),
                card.actionPlan() == null ? "" : card.actionPlan(), commentList, attachmentList,
                BacklogValues.exported(card, id -> cards.findById(card.projectId(), id)));
    }

    public record BacklogFile(String name, String content) {
    }

    public record ImportResult(int imported, List<String> warnings) {
    }
}
