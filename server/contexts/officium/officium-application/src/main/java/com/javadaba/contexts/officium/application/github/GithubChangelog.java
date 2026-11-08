package com.javadaba.contexts.officium.application.github;

import com.javadaba.contexts.officium.application.ChangelogService;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.ThirdPartyText;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * The changelog writing itself (JAVA-1565): each commit a push brings to the default branch of a
 * connected repository is recorded as a pending change, the same entry {@code scripts/officium-changelog.mjs}
 * writes from CI. Recording is idempotent on the commit's sha, so a redelivered webhook, or the CI path
 * running as well, writes nothing twice.
 */
@ApplicationScoped
public class GithubChangelog {

    private static final Logger LOG = Logger.getLogger(GithubChangelog.class);
    private static final int MAX_AREAS = 30;
    private static final int TITLE_CHARS = 200;

    private final ChangelogService changelog;

    @Inject
    public GithubChangelog(ChangelogService changelog) {
        this.changelog = changelog;
    }

    /** Records every commit of a push to the default branch; any other push records nothing. */
    public void record(Project project, GithubEvents.Push push, Actor actor) {
        if (!push.toDefaultBranch() || push.deleted()) {
            return;
        }
        for (GithubEvents.Commit commit : push.commits()) {
            if (commit.sha().isBlank()) {
                continue;
            }
            try {
                changelog.recordFromRepository(project, new ChangelogService.Change(commit.sha(), titleOf(commit),
                        commit.url(), areasOf(commit.paths()), mergedAt(commit.timestamp()), commit.message()), actor);
            } catch (OfficiumException ex) {
                // The allowance is full or the entry is refused: the push still links its cards.
                LOG.warnf("Changelog entry for %s not recorded: %s", commit.sha(), ex.getMessage());
            }
        }
    }

    static String titleOf(GithubEvents.Commit commit) {
        String first = ThirdPartyText.singleLine(commit.message(), TITLE_CHARS);
        return first.isEmpty() ? commit.sha() : first;
    }

    /** Where in the tree a change landed: an app or package, an API context, or the top directory. */
    static List<String> areasOf(List<String> paths) {
        Set<String> areas = new LinkedHashSet<>();
        for (String path : paths) {
            String[] parts = path.split("/");
            boolean nested = parts.length > 1 && parts[0].equals("packages") && parts[1].equals("apps")
                    || parts[0].equals("javadaba-api") && parts.length > 3;
            int depth = nested ? 3 : parts[0].equals("packages") || parts[0].equals("javadaba-api") ? 2 : 1;
            // A file at the top of a nested directory (javadaba-api/pom.xml) stays at its directory.
            String area = String.join("/", List.of(parts).subList(0, Math.min(depth, parts.length - 1)));
            areas.add(area.isEmpty() ? parts[0] : area);
        }
        return areas.stream().filter(area -> !area.isBlank()).limit(MAX_AREAS).toList();
    }

    private static Instant mergedAt(String timestamp) {
        try {
            return timestamp == null || timestamp.isBlank() ? null : OffsetDateTime.parse(timestamp).toInstant();
        } catch (DateTimeParseException ex) {
            return null;
        }
    }
}
