package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.DocStarService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;

/**
 * A person's stars and recent pages (JAVA-799, contract §8.21), the twins of the web's sidebar. Their
 * own class because {@link OfficiumMcpRegistry} is at its size allowance. Handlers read the service
 * lazily, so the registry test can build the table with none.
 */
final class McpDocStars {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpDocStars() {
    }

    static List<McpOperation<OfficiumCaller>> operations(DocStarService stars) {
        return List.of(
                new McpOperation<>("docs.starred",
                        "The pages and collections the caller starred, in their order: each with its `kind` "
                                + "(page|collection), where it sits now (`path`), `name`, `icon`, `iconColor`, "
                                + "`position` and its `page` summary. Stars are personal: nobody reads another "
                                + "person's. A star on a trashed page is hidden until it is restored.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                        Map.of("projectId", EX_PROJECT),
                        (caller, params) -> stars.starred(caller.accountId(), McpParams.uuid(params, "projectId"))),
                new McpOperation<>("docs.star",
                        "Stars a page for the caller (any member, a viewer too), or with `kind: collection` a "
                                + "first-level collection. Starring again keeps its place unless `position` "
                                + "(0-based) moves it. Answers the star and `created`. Pages under `officium/` "
                                + "answer `builtin_doc_read_only`.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(),
                                "kind", McpSchemas.stringEnum("page", "collection"), "position",
                                McpSchemas.integer()), List.of("projectId", "path")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy"),
                        (caller, params) -> {
                            DocStarService.Starred result = stars.star(caller.accountId(),
                                    McpParams.uuid(params, "projectId"), McpParams.requiredString(params, "path"),
                                    McpParams.string(params, "kind", null),
                                    McpParams.integer(params, "position", null));
                            return Map.of("star", result.star(), "created", result.created());
                        }),
                new McpOperation<>("docs.unstar", "Removes the caller's star. Idempotent: `unstarred` says whether "
                        + "there was one.", McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(),
                                "kind", McpSchemas.stringEnum("page", "collection")), List.of("projectId", "path")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy"),
                        (caller, params) -> Map.of("unstarred",
                                stars.unstar(caller.accountId(), McpParams.uuid(params, "projectId"),
                                        McpParams.requiredString(params, "path"),
                                        McpParams.string(params, "kind", null)))),
                new McpOperation<>("docs.recent",
                        "The pages the caller opened in the web, newest first, as summaries plus `viewedAt` "
                                + "(`limit` up to 50). Reading a page with docs.get does not count: an agent acts "
                                + "as its person, and its reads would fill their list.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "limit", McpSchemas.integer()),
                                List.of("projectId")),
                        Map.of("projectId", EX_PROJECT),
                        (caller, params) -> stars.recent(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.integer(params, "limit", null))),
                new McpOperation<>("docs.view",
                        "Records that the caller opened a page, for docs.recent. The web does it on its own when a "
                                + "page opens; call it only when you show the page to your person. `recorded` is "
                                + "false for Officium's own pages, which have no row.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string()),
                                List.of("projectId", "path")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy"),
                        (caller, params) -> Map.of("recorded", stars.view(caller.accountId(),
                                McpParams.uuid(params, "projectId"), McpParams.requiredString(params, "path")))));
    }
}
