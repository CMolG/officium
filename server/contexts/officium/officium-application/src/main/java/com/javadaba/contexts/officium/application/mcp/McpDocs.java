package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.DocSchema;
import com.javadaba.contexts.officium.application.DocSearchService;
import com.javadaba.contexts.officium.application.DocService;
import com.javadaba.contexts.officium.application.DocTemplates;
import com.javadaba.contexts.officium.application.DocTreeService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.DocSearchQuery;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * The documentation operations (JAVA-130, contract §8.7): the pages an agent reads before acting and
 * keeps up to date after, and (JAVA-791, §8.17) the tree they are laid out in. Their own class because
 * {@link OfficiumMcpRegistry} is over its size allowance.
 */
final class McpDocs {

    private static final String READ = McpOperation.READ;
    private static final String WRITE = McpOperation.WRITE;
    private static final String SCOPE_READ = "officium:read";
    private static final String SCOPE_WRITE = "officium:write";
    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpDocs() {
    }

    static List<McpOperation<OfficiumCaller>> operations(DocService docs, DocSearchService search,
            DocSchema docSchema, DocTreeService docTree) {
        List<McpOperation<OfficiumCaller>> list = new ArrayList<>();

        list.add(new McpOperation<>("docs.list",
                "Every documentation page of a project, by path (no bodies): the tree of its procedures. Read "
                        + "one with docs.get. Pages under `officium/` (`builtin: true`) are Officium's own, the same "
                        + "in every project and read-only.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> docs.list(caller.accountId(), McpParams.uuid(params, "projectId"))));

        list.add(new McpOperation<>("docs.get", "One page, with its Markdown body and its version.", READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string()),
                        List.of("projectId", "path")),
                Map.of("projectId", EX_PROJECT, "path", "procedures/deploy"),
                (caller, params) -> docs.get(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "path"))));

        list.add(new McpOperation<>("docs.search",
                "Ranked full-text search of a project's pages (and Officium's own): title and path matches "
                        + "first, then the body, each with a `snippet` (parts `{text, match}`) for the first 25. "
                        + "`text` takes \"a phrase\", OR and -word, and every term matches as a prefix. Optional "
                        + "filters: `collection` (a top-level path like `contracts`), `author` (an account id; "
                        + "its agents count), `updatedAfter` / `updatedBefore` (ISO-8601), `state` (`published`, "
                        + "`unpublished` = your own drafts, `archived`), `limit` (1-100) and `offset`. Left out, "
                        + "every match comes back. No bodies: read one with docs.get.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "text", McpSchemas.string(),
                        "collection", McpSchemas.string(), "author", McpSchemas.string(), "updatedAfter",
                        McpSchemas.string(), "updatedBefore", McpSchemas.string(), "state", McpSchemas.string(),
                        "limit", McpSchemas.integer(), "offset", McpSchemas.integer()),
                        List.of("projectId", "text")),
                Map.of("projectId", EX_PROJECT, "text", "deploy"),
                (caller, params) -> search.search(caller.accountId(), McpParams.uuid(params, "projectId"),
                        DocSearchQuery.of(McpParams.requiredString(params, "text"),
                                McpParams.string(params, "collection", null), McpParams.string(params, "author", null),
                                McpParams.string(params, "updatedAfter", null),
                                McpParams.string(params, "updatedBefore", null),
                                McpParams.string(params, "state", null), McpParams.integer(params, "limit", null),
                                McpParams.integer(params, "offset", null)))));

        list.add(new McpOperation<>("docs.upsert",
                "Writes the page at `path` (lower-case segments joined by /, like procedures/deploy). Read "
                        + "docs.schema before writing a page: it is how every page is laid out. To create, "
                        + "leave `expectedVersion` out and send a `title`; to change a page, send the version you "
                        + "read -- a stale or missing one answers `version_conflict` with `current`, the page to "
                        + "merge onto. `title`/`body` left out keep the page's. Markdown; add an image or file with docs.attachments.upload and refer to it as `doc://<path>/_files/<name>`. The answer is "
                        + "the page plus `findings`, what docs.lint finds against the schema: warnings, the page "
                        + "is saved whatever they say. Paths under `officium/` are Officium's own pages: refused "
                        + "with `builtin_doc_read_only`. `draft: true` on create keeps it unpublished (only you "
                        + "see it) until docs.publish. `editSession` (up to 64 letters, digits and hyphens) groups "
                        + "autosaves: the writes of one session by you within 5 minutes of its first keep one "
                        + "history version and one activity entry; leave it out and every write is its own. "
                        + "Templates, on create only: `template: true` makes the page a template (out of the tree "
                        + "and search, listed by docs.templates.list; never a draft); `fromTemplate: <path>` (no "
                        + "`body`) writes the template's body, and its title unless you send one, with `{date}`, "
                        + "`{time}`, `{datetime}` and `{author}` filled in `timeZone` (IANA, UTC by default).",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(), "title",
                        McpSchemas.string(), "body", McpSchemas.string(), "expectedVersion", McpSchemas.integer(),
                        "draft", McpSchemas.bool(), "editSession", McpSchemas.string(), "template", McpSchemas.bool(),
                        "fromTemplate", McpSchemas.string(), "timeZone", McpSchemas.string()),
                        List.of("projectId", "path")),
                Map.of("projectId", EX_PROJECT, "path", "procedures/deploy", "title", "Deploy",
                        "body", "1. Merge to main."),
                (caller, params) -> docs.upsert(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "path"), McpParams.string(params, "title", null),
                        McpParams.string(params, "body", null), McpParams.integer(params, "expectedVersion", null),
                        McpParams.bool(params, "draft", null), McpParams.string(params, "editSession", null),
                        new DocTemplates.Request(McpParams.bool(params, "template", null),
                                McpParams.string(params, "fromTemplate", null),
                                McpParams.string(params, "timeZone", null)),
                        caller.actor()).linted()));

        list.add(new McpOperation<>("docs.templates.list",
                "The project's templates, by path: pages kept out of the tree and search to start new pages "
                        + "from (docs.upsert `fromTemplate`). Each is a page summary plus `collection`, the "
                        + "collection it belongs to (its path's first segment), or null when it is the project's. "
                        + "Read one with docs.get.",
                READ, SCOPE_READ, McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> docs.templates(caller.accountId(), McpParams.uuid(params, "projectId"))));

        list.add(new McpOperation<>("docs.schema",
                "Officium's documentation page schema, as Markdown: the four page types, the sections each one "
                        + "needs and their order, the frontmatter, and how to format, block and word a page. Read it "
                        + "before writing or importing pages. It is part of the contract, not a page: no docs.list "
                        + "shows it.",
                READ, SCOPE_READ, McpSchemas.schema(Map.of(), List.of()), Map.of(),
                (caller, params) -> docSchema.schema()));

        list.add(new McpOperation<>("docs.lint",
                "Checks Markdown against the page schema's mechanical rules (docs.schema): send it as `body`, or "
                        + "name a page with `projectId` and `path`. Each finding has its `rule` (like "
                        + "`frontmatter.required` or `code.language`), its 1-based `line` and a `message`. No "
                        + "findings is not a finished page: what needs a reader is the schema's checklist.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(), "body",
                        McpSchemas.string()), List.of()),
                Map.of("projectId", EX_PROJECT, "path", "procedures/deploy"),
                (caller, params) -> docSchema.lint(caller.accountId(), McpParams.optionalUuid(params, "projectId"),
                        McpParams.string(params, "path", null), McpParams.string(params, "body", null))));

        // docs.delete moves a page to the trash: it lives with the rest of the page's life, in McpDocLifecycle.
        list.add(new McpOperation<>("docs.tree",
                "The documentation as it is laid out: `pinned` (Officium's own pages, always on top, read-only) and "
                        + "`collections`, the project's pages nested by path, each node with its name, `icon`, "
                        + "`iconColor`, `sortMode` (manual|alphabetical), `position`, `fullWidth`, `version` (0 = no layout "
                        + "row yet), its `page` (null for a path that only has pages under it) and `children`. "
                        + "docs.list is the flat list without layout.",
                READ, SCOPE_READ, McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> docTree.tree(caller.accountId(), McpParams.uuid(params, "projectId"))));

        list.add(new McpOperation<>("docs.node.update",
                "Changes how one node of the documentation tree looks and where it sits (editor+). `icon` is an "
                        + "icon name like `book-open` or exactly one emoji; `iconColor` one of the project palette; "
                        + "`sortMode` how its children order (manual|alphabetical); `position` (0-based) places it "
                        + "among its siblings and renumbers them, and is refused (`doc_sorted_alphabetically`) under "
                        + "an A-Z parent. `fullWidth` (boolean) draws the page at the full width of the screen for "
                        + "every viewer. An empty `icon` or `iconColor` clears it. A node with no layout row "
                        + "takes `expectedVersion` 0 or none; one with a row takes the version you read, and a "
                        + "stale one answers `version_conflict` with `current`. A first-segment path with no node "
                        + "becomes a new collection. Paths under `officium/` are refused with "
                        + "`builtin_doc_read_only`.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(), "icon",
                        McpSchemas.string(), "iconColor", McpSchemas.string(), "sortMode",
                        McpSchemas.stringEnum("manual", "alphabetical"), "position", McpSchemas.integer(),
                        "fullWidth", McpSchemas.bool(), "expectedVersion", McpSchemas.integer()),
                        List.of("projectId", "path")),
                Map.of("projectId", EX_PROJECT, "path", "procedures", "icon", "book-open", "iconColor", "teal"),
                (caller, params) -> docTree.updateNode(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "path"), McpParams.string(params, "icon", null),
                        McpParams.string(params, "iconColor", null), McpParams.string(params, "sortMode", null),
                        McpParams.integer(params, "position", null),
                        McpParams.bool(params, "fullWidth", null),
                        McpParams.integer(params, "expectedVersion", null), caller.actor()).node()));

        list.add(new McpOperation<>("docs.node.delete",
                "Deletes a node that has no page and nothing under it (editor+): the way back from a new "
                        + "collection. A node with pages answers `doc_node_not_empty`. `expectedVersion` is the "
                        + "node's version from docs.tree.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(),
                        "expectedVersion", McpSchemas.integer()), List.of("projectId", "path", "expectedVersion")),
                Map.of("projectId", EX_PROJECT, "path", "ideas", "expectedVersion", 1),
                (caller, params) -> {
                    docTree.deleteNode(caller.accountId(), McpParams.uuid(params, "projectId"),
                            McpParams.requiredString(params, "path"),
                            McpParams.integer(params, "expectedVersion", 0), caller.actor());
                    return Map.of("deleted", true);
                }));
        return list;
    }
}
