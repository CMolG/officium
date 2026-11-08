package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.github.GithubService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** The GitHub operations, out of {@link OfficiumMcpRegistry}, which is at its size allowance (card://JAVA-1528). */
final class McpGithub {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String READ = McpOperation.READ;
    private static final String WRITE = McpOperation.WRITE;
    private static final String SCOPE_READ = "officium:read";
    private static final String SCOPE_WRITE = "officium:write";

    private McpGithub() {
    }

    /** JAVA-375 (contract §8.10): which GitHub repositories feed the project, owner only. The webhook
     *  secret is configuration, never an operation: a secret doesn't pass through an agent. */
    static List<McpOperation<OfficiumCaller>> operations(GithubService github) {
        List<McpOperation<OfficiumCaller>> list = new ArrayList<>();
        list.add(new McpOperation<>("github.repositories",
                "The GitHub repositories whose commits, branches and pull requests link to this project's cards "
                        + "(`connected`), and those the Officium GitHub App is installed on that no project has "
                        + "connected yet (`available`). Owner only.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> github.repositories(caller.accountId(), McpParams.uuid(params, "projectId"))));

        list.add(new McpOperation<>("github.connect",
                "Connects an installed repository (`owner/repo`) to the project: from then on, a commit, branch "
                        + "or PR naming a card key links to that card, and a merge to the default branch closes "
                        + "a card in deploy. A repository feeds one project only. Owner only.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "repo", McpSchemas.string()),
                        List.of("projectId", "repo")),
                Map.of("projectId", EX_PROJECT, "repo", "cmolg/javadaba-webpage"),
                (caller, params) -> github.connect(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "repo"), caller.actor())));

        list.add(new McpOperation<>("github.disconnect",
                "Stops a repository's events from reaching the project; the links already made stay on their "
                        + "cards. Owner only.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "repo", McpSchemas.string()),
                        List.of("projectId", "repo")),
                Map.of("projectId", EX_PROJECT, "repo", "cmolg/javadaba-webpage"),
                (caller, params) -> github.disconnect(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "repo"), caller.actor())));
        return list;
    }
}
