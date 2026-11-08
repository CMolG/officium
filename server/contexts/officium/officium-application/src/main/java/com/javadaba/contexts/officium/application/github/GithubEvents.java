package com.javadaba.contexts.officium.application.github;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

/**
 * The parts of GitHub's webhook payloads Officium reads (JAVA-375), taken from a parsed tree with
 * {@link JsonNode#path}, so a missing field is an empty value rather than an exception and nothing is
 * bound by reflection (native image, invariant 8). Repository names are lower-cased: GitHub treats
 * {@code CMolG/Repo} and {@code cmolg/repo} as the same repository.
 */
public final class GithubEvents {

    private static final String HEADS = "refs/heads/";

    private GithubEvents() {
    }

    /** {@code paths} are the files the commit added, modified and removed; {@code timestamp} is ISO-8601. */
    public record Commit(String sha, String message, String url, String author, String timestamp,
            List<String> paths) {
    }

    /** {@code branch} is null for a tag push, which links nothing. */
    public record Push(String repo, String repoUrl, String branch, String defaultBranch, boolean deleted,
            String pusher, List<Commit> commits) {

        public boolean toDefaultBranch() {
            return branch != null && branch.equals(defaultBranch);
        }

        /** What names the cards a branch carries: its own name and every commit's message (JAVA-1880). */
        public String[] branchTexts() {
            return Stream.concat(Stream.of(branch), commits.stream().map(Commit::message)).toArray(String[]::new);
        }
    }

    /** {@code baseBranch} is where the pull request merges into; {@code defaultBranch} the repository's. */
    public record PullRequest(String action, String repo, int number, String title, String body, String headBranch,
            String url, String author, boolean merged, boolean closed, String baseBranch, String defaultBranch) {

        public boolean intoDefaultBranch() {
            return !baseBranch.isBlank() && baseBranch.equals(defaultBranch);
        }
    }

    /** Repositories an installation added and removed, in either installation event. */
    public record Installation(long installationId, List<String> added, List<String> removed) {
    }

    public static Push push(JsonNode payload) {
        String ref = payload.path("ref").asText("");
        List<Commit> commits = new ArrayList<>();
        for (JsonNode commit : payload.path("commits")) {
            JsonNode author = commit.path("author");
            List<String> paths = new ArrayList<>();
            for (String kind : List.of("added", "modified", "removed")) {
                commit.path(kind).forEach(path -> paths.add(path.asText("")));
            }
            commits.add(new Commit(commit.path("id").asText(""), commit.path("message").asText(""),
                    commit.path("url").asText(""), text(author.path("username"), author.path("name")),
                    commit.path("timestamp").asText(""), paths));
        }
        JsonNode repository = payload.path("repository");
        return new Push(repo(repository), repository.path("html_url").asText(""),
                ref.startsWith(HEADS) ? ref.substring(HEADS.length()) : null,
                repository.path("default_branch").asText(""), payload.path("deleted").asBoolean(false),
                text(payload.path("pusher").path("name"), payload.path("sender").path("login")), commits);
    }

    public static PullRequest pullRequest(JsonNode payload) {
        JsonNode pr = payload.path("pull_request");
        return new PullRequest(payload.path("action").asText(""), repo(payload.path("repository")),
                pr.path("number").asInt(payload.path("number").asInt()), pr.path("title").asText(""),
                pr.path("body").asText(""), pr.path("head").path("ref").asText(""), pr.path("html_url").asText(""),
                text(pr.path("user").path("login"), null), pr.path("merged").asBoolean(false),
                "closed".equals(pr.path("state").asText("")), pr.path("base").path("ref").asText(""),
                payload.path("repository").path("default_branch").asText(""));
    }

    /**
     * {@code installation} (created / deleted) or {@code installation_repositories} (added / removed).
     * Any other action (suspend, new permissions) changes no repository list.
     */
    public static Installation installation(String event, JsonNode payload) {
        long id = payload.path("installation").path("id").asLong();
        String action = payload.path("action").asText("");
        if ("installation_repositories".equals(event)) {
            return new Installation(id, names(payload.path("repositories_added")),
                    names(payload.path("repositories_removed")));
        }
        return switch (action) {
            case "created", "unsuspend" -> new Installation(id, names(payload.path("repositories")), List.of());
            case "deleted" -> new Installation(id, List.of(), names(payload.path("repositories")));
            default -> new Installation(id, List.of(), List.of());
        };
    }

    public static String normalizeRepo(String fullName) {
        return fullName == null ? "" : fullName.strip().toLowerCase(Locale.ROOT);
    }

    private static List<String> names(JsonNode repositories) {
        List<String> names = new ArrayList<>();
        for (JsonNode repository : repositories) {
            String name = normalizeRepo(repository.path("full_name").asText(""));
            if (!name.isEmpty()) {
                names.add(name);
            }
        }
        return names;
    }

    private static String repo(JsonNode repository) {
        return normalizeRepo(repository.path("full_name").asText(""));
    }

    private static String text(JsonNode first, JsonNode fallback) {
        String value = first.asText("");
        if (value.isBlank() && fallback != null) {
            value = fallback.asText("");
        }
        return value.isBlank() ? null : value;
    }
}
