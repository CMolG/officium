package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.DocMoveService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;

/**
 * Moving, duplicating and cross-referencing documentation (JAVA-792, contract §8.20). Their own class
 * because {@link McpDocs} would pass the size allowance.
 */
final class McpDocMoves {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpDocMoves() {
    }

    static List<McpOperation<OfficiumCaller>> operations(DocMoveService moves) {
        return List.of(
                new McpOperation<>("docs.move",
                        "Moves or renames the page or folder at `path` to `to`, with everything under it, in one "
                                + "transaction (editor+). Re-nesting and renaming are this one call. The old paths keep "
                                + "answering: a read of one answers the page with `redirectedFrom`. Links in other pages "
                                + "are not rewritten: the answer's `moved` lists every page's `from` and `to` so you can "
                                + "fix the references you hold, and docs.lint reports `link.redirected` for the rest. "
                                + "`position` (0-based) places it among its new siblings; none keeps its place under the "
                                + "same parent and puts it last under another. `expectedVersion` is the node's version "
                                + "from docs.tree. A taken target answers `doc_path_taken` with `paths` and moves "
                                + "nothing; `doc_move_same_path`, `doc_move_into_itself`, `reserved_doc_path` and "
                                + "`builtin_doc_read_only` refuse the rest.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(), "to",
                                McpSchemas.string(), "position", McpSchemas.integer(), "expectedVersion",
                                McpSchemas.integer()), List.of("projectId", "path", "to")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy", "to", "operations/deploy"),
                        (caller, params) -> moves.move(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "path"), McpParams.requiredString(params, "to"),
                                McpParams.integer(params, "position", null),
                                McpParams.integer(params, "expectedVersion", null), caller.actor())),
                new McpOperation<>("docs.duplicate",
                        "Copies the page at `path` (title and body) to `to`, which defaults to the first free "
                                + "`<path>-copy`, `<path>-copy-2`, ...; `title` defaults to `<title> (copy)`. It is a "
                                + "create: the answer is the new page plus `findings`, and the original is untouched. "
                                + "A taken `to` answers `doc_path_taken`. Folders are not duplicated.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(), "to",
                                McpSchemas.string(), "title", McpSchemas.string()), List.of("projectId", "path")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy"),
                        (caller, params) -> moves.duplicate(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "path"), McpParams.string(params, "to", null),
                                McpParams.string(params, "title", null), caller.actor()).linted()),
                new McpOperation<>("docs.backlinks",
                        "The pages whose text points at the page at `path` (a `doc://` reference, a relative `.md` "
                                + "link or a frontmatter `related` entry), including through a path that moved to it, "
                                + "by path and without bodies. Answers `redirectedFrom` when `path` was an old path.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string()),
                                List.of("projectId", "path")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy"),
                        (caller, params) -> moves.backlinks(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "path"))));
    }
}
