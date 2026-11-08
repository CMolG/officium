package com.javadaba.contexts.officium.application.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.ActivityPublisher;
import com.javadaba.contexts.officium.application.ProjectAccessGuard;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.github.CardKeyScanner;
import com.javadaba.contexts.officium.domain.github.DevLink;
import com.javadaba.contexts.officium.domain.github.GithubRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.DevLinkRepository;
import com.javadaba.contexts.officium.domain.ports.GithubRepositoryRepository;
import com.javadaba.contexts.officium.domain.ports.GithubUserAuthorization;
import com.javadaba.contexts.officium.domain.ports.ProjectRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * GitHub activity on cards (JAVA-375): Officium receives GitHub's events and does the state handling
 * itself, because the merge to the default branch is the user's deploy decision and no agent is around
 * when it happens.
 *
 * <p>The only automatic move is the one the user ruled (JAVA-372): a commit naming a card reaches the
 * default branch while the card is in {@code deploy} → the card goes to {@code done}, with a comment
 * carrying the sha. Any other open card gets the link and a comment, and stays where it is: review is
 * never skipped. Everything is keyed on the link, so a commit already seen on the default branch does
 * nothing the second time -- a redelivery is harmless even when the delivery id was never recorded --
 * except for a card still in {@code deploy}, whose move is still due.
 */
@ApplicationScoped
public class GithubService {

    /** Who automatic writes are attributed to: the project owner's account, as agent "GitHub". */
    public static final String AGENT_NAME = "GitHub";

    private static final Logger LOG = Logger.getLogger(GithubService.class);

    /** GitHub lets a delivery be redelivered for three days; a week of memory covers it. */
    static final Duration DELIVERY_MEMORY = Duration.ofDays(7);

    /** How long an authorization may take on GitHub's side before its state stops being accepted. */
    static final Duration STATE_LIFETIME = Duration.ofMinutes(10);

    /** A grant older than this doesn't count: access revoked on GitHub stops counting within a day. */
    static final Duration GRANT_LIFETIME = Duration.ofHours(24);

    private final GithubRepositoryRepository repositories;
    private final DevLinkRepository links;
    private final CardRepository cards;
    private final ProjectRepository projects;
    private final ProjectAccessGuard guard;
    private final GithubMerges merges;
    private final ActivityPublisher activity;
    private final GithubUserAuthorization authorization;
    private final GithubChangelog changelog;
    private final Clock clock;
    // An instance, never a static: a SecureRandom frozen into a native image heap is refused (invariant 8).
    private final SecureRandom random = new SecureRandom();

    @Inject
    public GithubService(GithubRepositoryRepository repositories, DevLinkRepository links, CardRepository cards,
            ProjectRepository projects, ProjectAccessGuard guard, GithubMerges merges, ActivityPublisher activity,
            GithubUserAuthorization authorization, GithubChangelog changelog) {
        this(repositories, links, cards, projects, guard, merges, activity, authorization, changelog,
                Clock.systemUTC());
    }

    GithubService(GithubRepositoryRepository repositories, DevLinkRepository links, CardRepository cards,
            ProjectRepository projects, ProjectAccessGuard guard, GithubMerges merges, ActivityPublisher activity,
            GithubUserAuthorization authorization, GithubChangelog changelog, Clock clock) {
        this.repositories = repositories;
        this.links = links;
        this.cards = cards;
        this.projects = projects;
        this.guard = guard;
        this.merges = merges;
        this.activity = activity;
        this.authorization = authorization;
        this.changelog = changelog;
        this.clock = clock;
    }

    // ── the webhook ────────────────────────────────────────────────────────────────────────────

    /** Applies one verified delivery. The caller has already checked its signature. */
    public Outcome handle(String event, String deliveryId, JsonNode payload) {
        String name = event == null ? "" : event;
        boolean tracked = deliveryId != null && !deliveryId.isBlank();
        if (tracked && repositories.deliverySeen(deliveryId)) {
            return new Outcome(name, true, null, List.of(), List.of());
        }
        Outcome outcome = switch (name) {
            case "installation", "installation_repositories" -> installation(name, payload);
            case "push" -> push(GithubEvents.push(payload));
            case "pull_request" -> pullRequest(GithubEvents.pullRequest(payload));
            default -> Outcome.ignored(name, "unhandled_event");
        };
        if (tracked && !outcome.retryable()) {
            Instant now = Instant.now(clock);
            repositories.recordDelivery(deliveryId, name, now, now.minus(DELIVERY_MEMORY));
        }
        return outcome;
    }

    private Outcome installation(String event, JsonNode payload) {
        GithubEvents.Installation installation = GithubEvents.installation(event, payload);
        Instant now = Instant.now(clock);
        installation.added().forEach(repo -> repositories.saveInstalled(repo, installation.installationId(), now));
        installation.removed().forEach(repositories::removeInstalled);
        return new Outcome(event, false, null, List.of(), List.of());
    }

    private Outcome push(GithubEvents.Push push) {
        if (push.branch() == null) {
            return Outcome.ignored("push", "not_a_branch");
        }
        Optional<Project> connected = projectFor(push.repo());
        if (connected.isEmpty()) {
            return Outcome.ignored("push", "repository_not_connected");
        }
        Project project = connected.get();
        Actor actor = actorFor(project);
        Instant now = Instant.now(clock);
        if (push.deleted()) {
            links.closeBranch(project.id(), push.repo(), push.branch(), now);
            return new Outcome("push", false, null, List.of(), List.of());
        }
        changelog.record(project, push, actor);
        Set<String> linked = new LinkedHashSet<>();
        boolean toDefault = push.toDefaultBranch();
        if (!toDefault) {
            // The branch carries every card its name or commits name; a squash merge keeps none (JAVA-1880).
            for (Card card : cardsNamed(project, push.branchTexts())) {
                if (save(card, DevLink.Kind.BRANCH, push.repo(), push.branch(), push.repoUrl() + "/tree/"
                        + push.branch(), push.branch(), push.pusher(), DevLink.State.OPEN, actor, now)) {
                    linked.add(card.key());
                }
            }
        }
        DevLink.State state = toDefault ? DevLink.State.MERGED : DevLink.State.OPEN;
        // Each card reaches the default branch once per push, with the latest commit naming it: N commits
        // about one card are one comment, not N.
        Map<UUID, Arrival> arrived = new LinkedHashMap<>();
        for (GithubEvents.Commit commit : push.commits()) {
            for (Card card : cardsNamed(project, commit.message())) {
                Optional<DevLink> previous = links.find(card.id(), DevLink.Kind.COMMIT, push.repo(), commit.sha());
                boolean merged = previous.isPresent() && previous.get().state() == DevLink.State.MERGED;
                // A merged link is done with, unless its card is still in deploy: then the move was lost
                // (two version conflicts in a row) or the card was approved after its merge, and it is due.
                if (previous.isPresent() && (!toDefault || merged && card.status() != Status.DEPLOY)) {
                    continue;
                }
                if (!merged) {
                    save(card, DevLink.Kind.COMMIT, push.repo(), commit.sha(), commit.url(), commit.message(),
                            commit.author(), state, actor, now);
                    linked.add(card.key());
                }
                if (toDefault) {
                    arrived.put(card.id(), new Arrival(card, commit));
                }
            }
        }
        List<String> moved = new ArrayList<>();
        boolean lost = false;
        for (Arrival arrival : arrived.values()) {
            switch (merges.reachedDefaultBranch(project, arrival.card(), arrival.commit(), push.defaultBranch(),
                    actor)) {
                case MOVED -> moved.add(arrival.card().key());
                case LOST -> lost = true;
                case TOLD, UNTOUCHED -> {
                }
            }
        }
        return new Outcome("push", false, null, List.copyOf(linked), moved, lost);
    }

    private record Arrival(Card card, GithubEvents.Commit commit) {
    }

    private Outcome pullRequest(GithubEvents.PullRequest pr) {
        Optional<Project> connected = projectFor(pr.repo());
        if (connected.isEmpty()) {
            return Outcome.ignored("pull_request", "repository_not_connected");
        }
        Project project = connected.get();
        Actor actor = actorFor(project);
        Instant now = Instant.now(clock);
        DevLink.State state = pr.merged()
                ? DevLink.State.MERGED
                : pr.closed() ? DevLink.State.CLOSED : DevLink.State.OPEN;
        List<String> linked = new ArrayList<>();
        for (Card card : cardsNamed(project, pr.title(), pr.body(), pr.headBranch())) {
            if (save(card, DevLink.Kind.PULL_REQUEST, pr.repo(), String.valueOf(pr.number()), pr.url(), pr.title(),
                    pr.author(), state, actor, now)) {
                linked.add(card.key());
            }
        }
        return new Outcome("pull_request", false, null, linked, merges.pullRequestMerged(project, pr, now, actor));
    }

    /** {@code true} when the link is new or its state changed, which is what a board shows. */
    private boolean save(Card card, DevLink.Kind kind, String repo, String ref, String url, String title,
            String author, DevLink.State state, Actor actor, Instant now) {
        DevLink latest = new DevLink(UUID.randomUUID(), card.projectId(), card.id(), kind, repo, ref, url, title,
                author, state, now, now);
        Optional<DevLink> previous = links.find(card.id(), kind, repo, ref);
        links.upsert(previous.map(p -> p.refreshedBy(latest)).orElse(latest));
        boolean changed = previous.isEmpty() || previous.get().state() != state;
        if (changed) {
            activity.record(card.projectId(), card.id(), card.key(), actor, "card.development",
                    kind.wire() + " " + (kind == DevLink.Kind.COMMIT ? shortSha(ref) : ref) + " " + state.wire()
                            + " in " + repo,
                    now);
            activity.publish("card.development", card.projectId(), card.id(), card.key(), null, actor, now);
        }
        return changed;
    }

    private List<Card> cardsNamed(Project project, String... texts) {
        List<Card> named = new ArrayList<>();
        for (String key : CardKeyScanner.scan(texts)) {
            cards.findByKey(project.id(), key).filter(card -> !card.deleted()).ifPresent(named::add);
        }
        return named;
    }

    private Optional<Project> projectFor(String repo) {
        return repositories.find(repo).map(GithubRepository::projectId).flatMap(projects::findById)
                .filter(project -> !project.archived());
    }

    private static Actor actorFor(Project project) {
        return Actor.agent(project.ownerAccountId(), AGENT_NAME);
    }

    static String shortSha(String sha) {
        return sha == null || sha.length() <= 7 ? sha : sha.substring(0, 7);
    }

    // ── the project setting ────────────────────────────────────────────────────────────────────

    /**
     * The repositories this project gets events from, and the installed ones nobody connected yet that
     * GitHub said, within the last day, the caller can reach (JAVA-397): another account's are never
     * listed, so their names don't leak.
     */
    public Repositories repositories(UUID accountId, UUID projectId) {
        requireOwner(accountId, projectId);
        Set<String> granted = repositories.grantedRepos(accountId, grantedSince());
        List<RepositoryView> connected = new ArrayList<>();
        List<RepositoryView> available = new ArrayList<>();
        for (GithubRepository repo : repositories.listInstalled()) {
            if (projectId.equals(repo.projectId())) {
                connected.add(RepositoryView.of(repo));
            } else if (repo.projectId() == null && granted.contains(repo.repo())) {
                available.add(RepositoryView.of(repo));
            }
        }
        return new Repositories(connected, available, authorization.configured());
    }

    public Repositories connect(UUID accountId, UUID projectId, String repo, Actor actor) {
        requireOwner(accountId, projectId);
        String name = GithubEvents.normalizeRepo(repo);
        if (name.isEmpty()) {
            throw OfficiumException.badRequest("repo_required", "Name the repository as owner/repo");
        }
        Optional<GithubRepository> installed = repositories.find(name);
        boolean ours = installed.map(found -> projectId.equals(found.projectId())).orElse(false);
        // Not installed and not granted answer alike: a 404 must not tell whether someone else installed it.
        if (installed.isEmpty() || !ours && !repositories.grantedRepos(accountId, grantedSince()).contains(name)) {
            throw OfficiumException.notFound("github_repository_not_installed", "The Officium GitHub App is not "
                    + "installed on \"" + name + "\" for you: install it there, or authorize with GitHub again, "
                    + "then connect it here");
        }
        Instant now = Instant.now(clock);
        if (!repositories.connect(name, projectId, now)) {
            throw OfficiumException.conflict("github_repository_taken",
                    "\"" + name + "\" already feeds another project; its owner disconnects it first");
        }
        activity.record(projectId, null, null, actor, "github.connected", "GitHub repository " + name + " connected",
                now);
        activity.publish("project.updated", projectId, null, null, null, actor, now);
        return repositories(accountId, projectId);
    }

    public Repositories disconnect(UUID accountId, UUID projectId, String repo, Actor actor) {
        requireOwner(accountId, projectId);
        String name = GithubEvents.normalizeRepo(repo);
        if (!repositories.disconnect(name, projectId)) {
            throw OfficiumException.notFound("github_repository_not_connected",
                    "\"" + name + "\" does not feed this project");
        }
        Instant now = Instant.now(clock);
        activity.record(projectId, null, null, actor, "github.disconnected",
                "GitHub repository " + name + " disconnected", now);
        activity.publish("project.updated", projectId, null, null, null, actor, now);
        return repositories(accountId, projectId);
    }

    // ── authorizing with GitHub (JAVA-397) ──────────────────────────────────────────────────────

    /**
     * Where the owner's browser goes to authorize the App (or install it, with {@code install}), with a
     * state bound to this account and project: random, stored hashed, used once, for ten minutes.
     */
    public String authorize(UUID accountId, UUID projectId, boolean install) {
        requireOwner(accountId, projectId);
        requireConfigured();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String state = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant now = Instant.now(clock);
        repositories.saveState(hash(state), accountId, projectId, now.plus(STATE_LIFETIME), now);
        // Without the App's slug there is no install page to send them to; authorizing still lists
        // whatever they already installed.
        return install
                ? authorization.installUrl(state).orElseGet(() -> authorization.authorizeUrl(state))
                : authorization.authorizeUrl(state);
    }

    /**
     * GitHub's redirect back. The state must be one this account was issued and not yet used, or
     * nothing happens ({@code 400 github_state_invalid}). Then the account's grants become exactly what
     * the user token lists -- never anything the redirect's query names -- and the token is gone.
     */
    public Authorization callback(UUID accountId, String code, String state, Actor actor) {
        requireConfigured();
        Instant now = Instant.now(clock);
        Optional<GithubRepositoryRepository.IssuedState> found = state == null || state.isBlank()
                ? Optional.empty()
                : repositories.consumeState(hash(state));
        GithubRepositoryRepository.IssuedState issued = found
                .filter(it -> it.accountId().equals(accountId) && now.isBefore(it.expiresAt()))
                .orElseThrow(() -> OfficiumException.badRequest("github_state_invalid", "This GitHub "
                        + "authorization was not started from your account, was already used, or took longer than "
                        + "ten minutes. Go back to the project and choose Authorize with GitHub again."));
        List<GithubUserAuthorization.Installation> installations;
        try {
            installations = authorization.installations(code);
        } catch (GithubUserAuthorization.Rejected ex) {
            LOG.infof("GitHub authorization for account %s refused: %s", accountId, ex.getMessage());
            return new Authorization(issued.projectId(), List.of(), "rejected");
        } catch (GithubUserAuthorization.Unavailable ex) {
            // The adapter's messages never carry the code or the token, so they are safe to log.
            LOG.warnf(ex, "GitHub authorization for account %s failed: %s", accountId, ex.getMessage());
            return new Authorization(issued.projectId(), List.of(), "unavailable");
        }
        Map<String, Long> granted = new LinkedHashMap<>();
        for (GithubUserAuthorization.Installation installation : installations) {
            for (String listed : installation.repos()) {
                String repo = GithubEvents.normalizeRepo(listed);
                if (!repo.isEmpty()) {
                    granted.put(repo, installation.id());
                }
            }
        }
        // The token proves the installation, so a repository whose installation event hasn't arrived yet
        // (installing from Officium lands here first) is choosable right away.
        granted.forEach((repo, installation) -> repositories.saveInstalled(repo, installation, now));
        repositories.replaceGrants(accountId, granted, now);
        activity.record(issued.projectId(), null, null, actor, "github.authorized", "Authorized with GitHub: "
                + granted.size() + (granted.size() == 1 ? " repository" : " repositories"), now);
        activity.publish("project.updated", issued.projectId(), null, null, null, actor, now);
        return new Authorization(issued.projectId(), List.copyOf(granted.keySet()), null);
    }

    private void requireConfigured() {
        if (!authorization.configured()) {
            throw new OfficiumException("github_not_configured", "The Officium GitHub App's client id and secret "
                    + "are not configured", 503);
        }
    }

    private Instant grantedSince() {
        return Instant.now(clock).minus(GRANT_LIFETIME);
    }

    private static String hash(String state) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(state.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is missing from this JVM", ex);
        }
    }

    private void requireOwner(UUID accountId, UUID projectId) {
        if (guard.requireAccess(projectId, accountId).role() != Role.OWNER) {
            throw OfficiumException.forbidden("owner_only", "Only the project's owner connects GitHub repositories");
        }
    }

    // ── shapes ─────────────────────────────────────────────────────────────────────────────────

    /**
     * What one delivery did: the keys it linked and moved, or why it was ignored. {@code retryable}: a
     * move to done was lost, so the delivery is not remembered and GitHub's redelivery tries it again.
     */
    public record Outcome(String event, boolean duplicate, String ignored, List<String> linked, List<String> moved,
            boolean retryable) {

        Outcome(String event, boolean duplicate, String ignored, List<String> linked, List<String> moved) {
            this(event, duplicate, ignored, linked, moved, false);
        }

        static Outcome ignored(String event, String reason) {
            return new Outcome(event, false, reason, List.of(), List.of());
        }
    }

    public record RepositoryView(String repo, Instant installedAt, Instant connectedAt) {

        static RepositoryView of(GithubRepository repo) {
            return new RepositoryView(repo.repo(), repo.installedAt(), repo.connectedAt());
        }
    }

    /** {@code authorizable}: whether the App's OAuth client is configured, so authorizing can work at all. */
    public record Repositories(List<RepositoryView> connected, List<RepositoryView> available, boolean authorizable) {
    }

    /** Where the callback returns to, what was granted, and {@code failure} ({@code rejected} or
     *  {@code unavailable}) when GitHub didn't answer the code; then nothing changed. */
    public record Authorization(UUID projectId, List<String> repos, String failure) {
    }
}
