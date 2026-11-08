package com.javadaba.contexts.officium.domain.github;

import com.javadaba.contexts.officium.domain.ThirdPartyText;

import java.time.Instant;
import java.util.Arrays;
import java.util.Objects;
import java.util.UUID;

/**
 * One piece of GitHub activity that names a card (JAVA-375): a commit, a branch or a pull request,
 * like Jira's development panel. {@code ref} is the commit sha, the branch name or the PR number;
 * {@code (cardId, kind, repo, ref)} is unique, so the same event seen twice updates the link.
 *
 * <p>{@code state}: a commit is {@code open} until it is seen on the default branch ({@code merged});
 * a branch is {@code open} until deleted ({@code closed}); a PR is whatever GitHub says.
 */
public record DevLink(UUID id, UUID projectId, UUID cardId, Kind kind, String repo, String ref, String url,
        String title, String author, State state, Instant createdAt, Instant updatedAt) {

    public static final int TITLE_MAX = 200;
    public static final int AUTHOR_MAX = 100;

    /** The title and the author are written by whoever pushed: one sanitized line each (JAVA-1442). */
    public DevLink {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(state, "state");
        title = ThirdPartyText.singleLine(title, TITLE_MAX);
        author = author == null ? null : ThirdPartyText.singleLine(author, AUTHOR_MAX);
    }

    /** The same link as {@code latest} saw it, keeping when it was first seen. */
    public DevLink refreshedBy(DevLink latest) {
        return new DevLink(id, projectId, cardId, kind, repo, ref, latest.url(), latest.title(), latest.author(),
                latest.state(), createdAt, latest.updatedAt());
    }

    public enum Kind {
        COMMIT("commit"), BRANCH("branch"), PULL_REQUEST("pullRequest");

        private final String wire;

        Kind(String wire) {
            this.wire = wire;
        }

        public String wire() {
            return wire;
        }

        public static Kind fromWire(String value) {
            return Arrays.stream(values()).filter(k -> k.wire.equals(value)).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Unknown dev link kind " + value));
        }
    }

    public enum State {
        OPEN("open"), MERGED("merged"), CLOSED("closed");

        private final String wire;

        State(String wire) {
            this.wire = wire;
        }

        public String wire() {
            return wire;
        }

        public static State fromWire(String value) {
            return Arrays.stream(values()).filter(s -> s.wire.equals(value)).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Unknown dev link state " + value));
        }
    }
}
