package com.javadaba.contexts.officium.domain.github;

import java.time.Instant;
import java.util.UUID;

/**
 * A repository the Officium GitHub App is installed on (JAVA-375), {@code owner/repo} lower-cased.
 * {@code projectId} is the one project its events go to, set by that project's owner; null while
 * nobody has connected it, and then its events are received and ignored.
 */
public record GithubRepository(String repo, long installationId, UUID projectId, Instant installedAt,
        Instant connectedAt) {
}
