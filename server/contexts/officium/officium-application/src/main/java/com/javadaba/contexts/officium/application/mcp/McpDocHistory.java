package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.DocHistoryService;
import com.javadaba.contexts.officium.application.DocImportService;
import com.javadaba.contexts.officium.application.DocPresenceService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * JAVA-794's operations: a page's kept versions, restoring or deleting one, and the project's
 * history window. Their own class because {@link OfficiumMcpRegistry} is at its size allowance.
 */
final class McpDocHistory {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String EX_REVISION = "44444444-4444-4444-4444-444444444444";

    private McpDocHistory() {
    }

    /** JAVA-778 (contract §8.13): a bulk documentation import. The agent only ever holds the code; the
     *  pages travel from disk to the API in a script, never through the conversation. */
    static McpOperation<OfficiumCaller> importCode(DocImportService docImports) {
        return new McpOperation<>("docs.importCode",
                "A one-time code for importing MANY documentation pages from files without passing their content "
                        + "through you (editor+). It works only for this project's documentation, for 15 minutes "
                        + "(`expiresAt`), until the import is closed. Give it to the import script, never to a "
                        + "page or a card: the script POSTs batches of {path, title, body} to `importUrl` with "
                        + "`Authorization: Bearer <code>`, reads the pages back with the same code to compare "
                        + "hashes, and DELETEs `importUrl` to close it. For one or two pages, use docs.upsert. Pages "
                        + "follow docs.schema; each saved page comes back with its lint `findings`, which never stop "
                        + "it from saving.",
                McpOperation.WRITE, "officium:write",
                McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> docImports.issue(caller.accountId(), McpParams.uuid(params, "projectId")));
    }

    /** JAVA-802: who is on a page. The beat and the leave are a person's open page and have no MCP twin. */
    static McpOperation<OfficiumCaller> presence(DocPresenceService presence) {
        return new McpOperation<>("docs.presence",
                "Who has a page open right now: people only (an agent is a page's last editor, never present), "
                        + "each `viewing` or `editing`, with `since` and `expiresInSeconds`. You see your person "
                        + "too.",
                McpOperation.READ, "officium:read",
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string()),
                        List.of("projectId", "path")),
                Map.of("projectId", EX_PROJECT, "path", "procedures/deploy"),
                (caller, params) -> presence.get(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "path")));
    }

    static List<McpOperation<OfficiumCaller>> operations(DocHistoryService history, DocPresenceService presence) {
        return Stream.concat(historyOperations(history).stream(), Stream.of(presence(presence))).toList();
    }

    private static List<McpOperation<OfficiumCaller>> historyOperations(DocHistoryService history) {
        Map<String, Object> pagePath = Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string());
        return List.of(
                new McpOperation<>("docs.history",
                        "The versions kept of a page: the heaviest one ever (`heaviest`, never expires) and the two "
                                + "latest previous ones, each with its Markdown, size, author, dates and `expiresAt` "
                                + "(null for the heaviest). `historyDays` is how long the recent ones are kept.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(pagePath, List.of("projectId", "path")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy"),
                        (caller, params) -> history.history(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "path"))),
                new McpOperation<>("docs.revision.restore",
                        "Makes a kept version the page's new current version. It is a normal write, so it can be "
                                + "undone by restoring the version it replaced (`revisionId` in the answer). "
                                + "`expectedVersion` is the page's current version, as on docs.upsert.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(),
                                "revisionId", McpSchemas.string(), "expectedVersion", McpSchemas.integer()),
                                List.of("projectId", "path", "revisionId", "expectedVersion")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy", "revisionId", EX_REVISION,
                                "expectedVersion", 3),
                        (caller, params) -> history.restore(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "path"), McpParams.uuid(params, "revisionId"),
                                McpParams.integer(params, "expectedVersion", null), caller.actor()).linted()),
                new McpOperation<>("docs.revision.delete",
                        "Deletes a kept version for good, the heaviest included. `confirm` must be the page's title, "
                                + "typed: else `confirmation_mismatch`.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(),
                                "revisionId", McpSchemas.string(), "confirm", McpSchemas.string()),
                                List.of("projectId", "path", "revisionId", "confirm")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy", "revisionId", EX_REVISION,
                                "confirm", "Deploy"),
                        (caller, params) -> {
                            history.deleteRevision(caller.accountId(), McpParams.uuid(params, "projectId"),
                                    McpParams.requiredString(params, "path"), McpParams.uuid(params, "revisionId"),
                                    McpParams.requiredString(params, "confirm"), caller.actor());
                            return Map.of("deleted", true);
                        }),
                new McpOperation<>("docs.settings.get",
                        "The project's documentation settings: how many days recent versions are kept "
                                + "(`historyDays`) and the bytes of pages, history, attachments and trash.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                        Map.of("projectId", EX_PROJECT),
                        (caller, params) -> history.settings(caller.accountId(), McpParams.uuid(params, "projectId"))),
                new McpOperation<>("docs.settings.update",
                        "Sets how many days (0 to 3650, default 15) the two recent versions of a page are kept; the "
                                + "heaviest never expires. Owner only. 0 keeps only the heaviest. It applies to kept "
                                + "versions at once.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "historyDays",
                                McpSchemas.integer(), "expectedVersion", McpSchemas.integer()),
                                List.of("projectId", "historyDays")),
                        Map.of("projectId", EX_PROJECT, "historyDays", 30),
                        (caller, params) -> history.updateSettings(caller.accountId(),
                                McpParams.uuid(params, "projectId"), McpParams.integer(params, "historyDays", null),
                                McpParams.integer(params, "expectedVersion", null), caller.actor())));
    }
}
