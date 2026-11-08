package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Who is on a documentation page (JAVA-802, contract §8.19): a person's open page beats here, and the
 * others hear about an arrival, a leave or a change of state through {@code doc.presence}, which
 * names the page and carries no body. Only a person's session can beat; an agent can read.
 */
@ApplicationScoped
public class DocPresenceService {

    public static final int BEAT_SECONDS = 20;
    private static final String VIEWING = "viewing";
    private static final String EDITING = "editing";

    private final DocPageRepository docs;
    private final BuiltinDocs builtins;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final NicknameService nicknames;
    private final DocPresenceBoard board;
    private final Clock clock;

    @Inject
    public DocPresenceService(DocPageRepository docs, BuiltinDocs builtins, ProjectAccessGuard guard,
            ActivityPublisher activity, NicknameService nicknames) {
        this(docs, builtins, guard, activity, nicknames, Clock.systemUTC());
    }

    DocPresenceService(DocPageRepository docs, BuiltinDocs builtins, ProjectAccessGuard guard,
            ActivityPublisher activity, NicknameService nicknames, Clock clock) {
        this.docs = docs;
        this.builtins = builtins;
        this.guard = guard;
        this.activity = activity;
        this.nicknames = nicknames;
        this.clock = clock;
        this.board = new DocPresenceBoard(clock);
    }

    /** The page's people, the caller included: an agent reading for its person must see them. */
    public record DocPresence(String path, int beatSeconds, List<Person> present) {
    }

    public record Person(UUID accountId, String name, String state, Instant since, long expiresInSeconds) {
    }

    public DocPresence beat(UUID accountId, UUID projectId, String path, String client, String state) {
        UUID clientId = clientId(client);
        Target page = requirePage(accountId, projectId, path);
        String normalized = page.path();
        String wanted = state == null ? VIEWING : state;
        if (!wanted.equals(VIEWING) && !wanted.equals(EDITING)) {
            throw OfficiumException.badRequest("invalid_presence_state", "State is \"viewing\" or \"editing\"");
        }
        if (wanted.equals(EDITING)) {
            guard.requireAtLeast(projectId, accountId, Role.EDITOR);
            if (DocPage.isBuiltin(normalized)) {
                throw OfficiumException.forbidden("builtin_doc_read_only", "Officium's own pages are read-only: "
                        + "nobody edits them");
            }
        }
        if (board.beat(projectId, normalized, clientId, accountId, wanted, () -> nicknames.displayName(accountId,
                projectId)) && page.shared()) {
            announce(projectId, normalized, accountId);
        }
        return view(projectId, normalized);
    }

    /** Idempotent: leaving a page one is not on is not an error. */
    public void leave(UUID accountId, UUID projectId, String path, String client) {
        UUID clientId = clientId(client);
        guard.requireAccess(projectId, accountId);
        String normalized = DocPage.normalizePath(path);
        if (board.leave(projectId, normalized, clientId, accountId) && shared(projectId, normalized)) {
            announce(projectId, normalized, accountId);
        }
    }

    public DocPresence get(UUID accountId, UUID projectId, String path) {
        return view(projectId, requirePage(accountId, projectId, path).path());
    }

    private DocPresence view(UUID projectId, String path) {
        List<Person> people = board.present(projectId, path).stream()
                .map(p -> new Person(p.accountId(), p.name(), p.state(), p.since(), p.expiresInSeconds()))
                .toList();
        return new DocPresence(path, BEAT_SECONDS, people);
    }

    /** A page the caller may see. {@code shared} is false for an unpublished draft (JAVA-793): its presence is
     *  announced to nobody, since {@code doc.presence} reaches every member and would name a path only its
     *  creator may know. */
    private record Target(String path, boolean shared) {
    }

    private Target requirePage(UUID accountId, UUID projectId, String path) {
        guard.requireAccess(projectId, accountId);
        String normalized = DocPage.normalizePath(path);
        if (DocPage.isBuiltin(normalized)) {
            builtins.find(normalized).orElseThrow(DocPresenceService::notFound);
            return new Target(normalized, true);
        }
        DocPage page = docs.find(projectId, normalized).filter(found -> found.visibleTo(accountId))
                .orElseThrow(DocPresenceService::notFound);
        return new Target(normalized, page.lifecycle().published());
    }

    private boolean shared(UUID projectId, String path) {
        return DocPage.isBuiltin(path)
                || docs.find(projectId, path).map(page -> page.lifecycle().published()).orElse(false);
    }

    private static OfficiumException notFound() {
        return OfficiumException.notFound("doc_not_found", "No such page");
    }

    private void announce(UUID projectId, String path, UUID accountId) {
        activity.publishDoc("doc.presence", projectId, path, null, Actor.person(accountId,
                nicknames.displayName(accountId, projectId)), Instant.now(clock));
    }

    private static UUID clientId(String client) {
        try {
            return UUID.fromString(client == null ? "" : client);
        } catch (IllegalArgumentException ex) {
            throw OfficiumException.badRequest("invalid_presence_client", "client is a UUID the page makes up");
        }
    }
}
