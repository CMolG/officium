package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.ChangelogEntry;
import com.javadaba.contexts.officium.domain.ChangelogToken;
import com.javadaba.contexts.officium.domain.DocsStatus;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.ChangelogRepository;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import com.javadaba.contexts.officium.domain.ports.ProjectRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The documentation's drift control (JAVA-132, contract §8.8): every change that reaches main is
 * recorded here as pending, and stays pending until someone says what the docs did about it.
 *
 * <p>The writer that can't forget is the project's pipeline, which records each merge with the
 * project's token ({@link #ingest}); a member can record one by hand too. Either way recording is
 * idempotent on the change's {@code ref}, so a retried pipeline never writes a second entry.
 */
@ApplicationScoped
public class ChangelogService {

    public static final int DEFAULT_LIMIT = 100;
    public static final int MAX_LIMIT = 500;

    /** Who a token-recorded change is attributed to: the owner's account, as their pipeline. */
    public static final String PIPELINE = "Pipeline";

    private final ChangelogRepository changelog;
    private final DocPageRepository docs;
    private final BuiltinDocs builtins;
    private final ProjectRepository projects;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final StorageQuotaService quota;
    private final DeployCloser deploys;
    private final Clock clock;

    @Inject
    public ChangelogService(ChangelogRepository changelog, DocPageRepository docs, BuiltinDocs builtins,
            ProjectRepository projects, ProjectAccessGuard guard, ActivityPublisher activity,
            StorageQuotaService quota, DeployCloser deploys) {
        this(changelog, docs, builtins, projects, guard, activity, quota, deploys, Clock.systemUTC());
    }

    ChangelogService(ChangelogRepository changelog, DocPageRepository docs, BuiltinDocs builtins,
            ProjectRepository projects, ProjectAccessGuard guard, ActivityPublisher activity, StorageQuotaService quota,
            DeployCloser deploys, Clock clock) {
        this.changelog = changelog;
        this.docs = docs;
        this.builtins = builtins;
        this.projects = projects;
        this.guard = guard;
        this.activity = activity;
        this.quota = quota;
        this.deploys = deploys;
        this.clock = clock;
    }

    /** Newest merge first, filtered by {@code status} when given, with the project's pending count. */
    public Listing list(UUID accountId, UUID projectId, String status, Integer limit) {
        guard.requireAccess(projectId, accountId);
        DocsStatus filter = status == null || status.isBlank() ? null : DocsStatus.fromWire(status);
        int size = limit == null || limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
        List<ChangelogEntryView> items = changelog.list(projectId, filter, size).stream()
                .map(ChangelogEntryView::of).toList();
        return new Listing(items, changelog.countPending(projectId));
    }

    /** A member recording a change by hand (editor+). */
    public Recorded record(UUID accountId, UUID projectId, Change change, Actor actor) {
        return record(guard.requireAtLeast(projectId, accountId, Role.EDITOR).project(), change, actor);
    }

    /** The project's pipeline recording a change with the token its owner gave it. */
    public Recorded ingest(String token, Change change) {
        Project project = (token == null || !token.startsWith(ChangelogToken.PREFIX)
                ? Optional.<UUID>empty()
                : changelog.projectForTokenHash(ChangelogToken.hash(token)))
                .flatMap(projects::findById)
                .orElseThrow(() -> new OfficiumException("invalid_token",
                        "This token records nothing: it is unknown or was revoked. The project's owner creates "
                                + "a new one in the project's Documentation, under Changelog.",
                        401));
        return record(project, change, Actor.agent(project.ownerAccountId(), PIPELINE));
    }

    /** A change the project's connected GitHub repository reported (JAVA-1565): the same entry the pipeline would write. */
    public Recorded recordFromRepository(Project project, Change change, Actor actor) {
        return record(project, change, actor);
    }

    /**
     * What the docs did about a change: {@code reviewed} (nothing needed), {@code updated} with the
     * pages that were, or back to {@code pending}. Takes the version read, like every write here.
     */
    public ChangelogEntryView mark(UUID accountId, UUID projectId, UUID entryId, String status, List<String> pages,
            int expectedVersion, Actor actor) {
        var access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        ChangelogEntry current = require(projectId, entryId);
        if (current.version() != expectedVersion) {
            throw new ChangelogVersionConflictException(ChangelogEntryView.of(current));
        }
        Instant now = Instant.now(clock);
        ChangelogEntry marked = current.marked(DocsStatus.fromWire(status), pages, actor, now);
        if (marked.sameMarkAs(current)) {
            return ChangelogEntryView.of(current);
        }
        for (String page : marked.pages()) {
            // A change to Officium's own pages (JAVA-783) is marked against them like any other page.
            if (docs.find(projectId, page).isEmpty() && builtins.find(page).isEmpty()) {
                throw OfficiumException.badRequest("unknown_doc_page",
                        "The project has no page \"" + page + "\": name the pages that were updated as docs.list "
                                + "lists them");
            }
        }
        quota.requireRoom(access.project(), marked.bytes() - current.bytes());
        if (!changelog.updateMarkIfVersion(marked, expectedVersion)) {
            throw new ChangelogVersionConflictException(ChangelogEntryView.of(require(projectId, entryId)));
        }
        publish(marked.projectId(), actor, "changelog.marked", "Change " + shortRef(marked) + " marked "
                + marked.status().wire() + (marked.pages().isEmpty() ? "" : ": " + String.join(", ", marked.pages())),
                now);
        return ChangelogEntryView.of(marked);
    }

    /** Whether the project's pipeline can record changes; any member may know. */
    public TokenStatus tokenStatus(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return changelog.token(projectId)
                .map(token -> new TokenStatus(true, ActorJson.of(token.createdBy()), token.createdAt()))
                .orElse(new TokenStatus(false, null, null));
    }

    /**
     * A new token for the project's pipeline, replacing the old one, which stops working at once.
     * The plain token is in this answer and nowhere else.
     */
    public IssuedToken issueToken(UUID accountId, UUID projectId, Actor actor) {
        requireOwner(accountId, projectId);
        Instant now = Instant.now(clock);
        // Two random UUIDs: 244 random bits from the JDK's SecureRandom, drawn per call, so nothing
        // random is frozen into a native image (invariant 8) -- as ProjectMachineService does.
        String token = ChangelogToken.PREFIX + UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
        changelog.saveToken(new ChangelogToken(projectId, ChangelogToken.hash(token), actor, now));
        publish(projectId, actor, "changelog.token", "Pipeline token created; any previous one stopped working", now);
        return new IssuedToken(token, now);
    }

    public void revokeToken(UUID accountId, UUID projectId, Actor actor) {
        requireOwner(accountId, projectId);
        if (changelog.deleteToken(projectId)) {
            publish(projectId, actor, "changelog.token", "Pipeline token revoked", Instant.now(clock));
        }
    }

    private Recorded record(Project project, Change change, Actor actor) {
        Instant now = Instant.now(clock);
        ChangelogEntry entry = ChangelogEntry.recorded(project.id(), change.ref(), change.title(), change.url(),
                change.areas(), change.mergedAt(), actor, now);
        var existing = changelog.findByRef(project.id(), entry.ref());
        if (existing.isPresent()) {
            return new Recorded(ChangelogEntryView.of(existing.get()), false);
        }
        quota.requireRoom(project, entry.bytes());
        if (!changelog.insert(entry)) {
            // A concurrent retry recorded it first: the same change, so the same answer.
            return new Recorded(ChangelogEntryView.of(changelog.findByRef(project.id(), entry.ref()).orElseThrow()),
                    false);
        }
        publish(project.id(), actor, "changelog.recorded", "Change " + shortRef(entry) + " recorded: " + entry.title(),
                now);
        // card://JAVA-1584: the merge is the evidence for Completed; the body carries a squash's commit subjects.
        deploys.closeCarried(project, entry.ref(), entry.url(), change.title() + "\n" + nullToEmpty(change.message()),
                actor);
        return new Recorded(ChangelogEntryView.of(entry), true);
    }

    private void requireOwner(UUID accountId, UUID projectId) {
        if (guard.requireAccess(projectId, accountId).role() != Role.OWNER) {
            throw OfficiumException.forbidden("owner_only", "Only the project's owner connects its pipeline");
        }
    }

    private ChangelogEntry require(UUID projectId, UUID entryId) {
        return changelog.find(projectId, entryId)
                .orElseThrow(() -> OfficiumException.notFound("changelog_entry_not_found", "No such change"));
    }

    private void publish(UUID projectId, Actor actor, String operation, String summary, Instant at) {
        activity.record(projectId, null, null, actor, operation, summary, at);
        activity.publish("changelog.changed", projectId, null, null, null, actor, at);
    }

    private static String nullToEmpty(String text) {
        return text == null ? "" : text;
    }

    private static String shortRef(ChangelogEntry entry) {
        return entry.ref().length() <= 12 ? entry.ref() : entry.ref().substring(0, 12);
    }

    /**
     * A change as its recorder reports it; everything but {@code ref} and {@code title} is optional. {@code message}
     * is the commit's whole message, read for the card keys it carries (card://JAVA-1584) and never stored.
     */
    public record Change(String ref, String title, String url, List<String> areas, Instant mergedAt, String message) {

        public Change(String ref, String title, String url, List<String> areas, Instant mergedAt) {
            this(ref, title, url, areas, mergedAt, null);
        }
    }

    /** {@code created} tells REST to answer 201 instead of 200. */
    public record Recorded(ChangelogEntryView entry, boolean created) {
    }

    public record Listing(List<ChangelogEntryView> items, int pendingCount) {
    }

    public record TokenStatus(boolean configured, ActorJson createdBy, Instant createdAt) {
    }

    public record IssuedToken(String token, Instant createdAt) {
    }
}
