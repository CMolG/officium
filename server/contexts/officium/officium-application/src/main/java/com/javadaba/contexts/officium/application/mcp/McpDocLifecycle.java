package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.DocAttachmentService;
import com.javadaba.contexts.officium.application.DocLifecycleService;
import com.javadaba.contexts.officium.application.DocMoveService;
import com.javadaba.contexts.officium.application.DocService;
import com.javadaba.contexts.officium.application.DocStarService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The life of a documentation page past its content (JAVA-793, contract §8.7): deleting into the
 * trash, publishing an unpublished draft, archiving, and the trash. Its own class because
 * {@link OfficiumMcpRegistry} is at its size allowance. Handlers read the services lazily, so the
 * registry test can build the table with none.
 */
final class McpDocLifecycle {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String EX_PAGE = "33333333-3333-3333-3333-333333333333";

    private McpDocLifecycle() {
    }

    /** The page's life, then moving it (JAVA-792), a person's stars and recents (JAVA-799) and a page's files
     *  (JAVA-798), which share this class because the registry is at its allowance. */
    static List<McpOperation<OfficiumCaller>> operations(DocService docs, DocLifecycleService lifecycle,
            DocMoveService moves, DocStarService stars, DocAttachmentService files) {
        List<McpOperation<OfficiumCaller>> all = new ArrayList<>(lifecycleOperations(docs, lifecycle));
        all.addAll(McpDocMoves.operations(moves));
        all.addAll(McpDocStars.operations(stars));
        all.addAll(McpDocAttachments.operations(files));
        return all;
    }

    private static List<McpOperation<OfficiumCaller>> lifecycleOperations(DocService docs,
            DocLifecycleService lifecycle) {
        return List.of(
                new McpOperation<>("docs.delete",
                        "Moves a page to the trash, where it can be restored (docs.restore) for 30 days. "
                                + "`expectedVersion` works as on docs.upsert. Answers the page's `id` and when "
                                + "it is purged (`purgeAfter`). Its path is free meanwhile.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(),
                                "expectedVersion", McpSchemas.integer()),
                                List.of("projectId", "path", "expectedVersion")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy", "expectedVersion", 1),
                        (caller, params) -> {
                            DocService.Trashed trashed = docs.delete(caller.accountId(),
                                    McpParams.uuid(params, "projectId"), McpParams.requiredString(params, "path"),
                                    McpParams.integer(params, "expectedVersion", 0), caller.actor());
                            Map<String, Object> answer = new LinkedHashMap<>();
                            answer.put("deleted", true);
                            answer.put("id", trashed.id());
                            answer.put("purgeAfter", trashed.purgeAfter());
                            return answer;
                        }),
                pageOperation("docs.publish",
                        "Publishes your unpublished draft (created with docs.upsert `draft: true`): from then on "
                                + "everyone in the project sees it. Publishing a published page changes nothing.",
                        (account, project, path, actor) -> lifecycle.publish(account, project, path, actor)),
                pageOperation("docs.archive",
                        "Archives a published page: it leaves the tree and search, and stays readable by its "
                                + "path with `archivedAt`/`archivedBy`. Changing it is refused until docs.unarchive.",
                        (account, project, path, actor) -> lifecycle.archive(account, project, path, actor)),
                pageOperation("docs.unarchive", "Brings an archived page back into the tree.",
                        (account, project, path, actor) -> lifecycle.unarchive(account, project, path, actor)),
                listOperation("docs.drafts", "Your own unpublished drafts, by path, without bodies. Nobody else "
                        + "sees them.", (account, project) -> lifecycle.unpublished(account, project)),
                listOperation("docs.archived", "The archived pages of a project, newest first, without bodies.",
                        (account, project) -> lifecycle.archived(account, project)),
                listOperation("docs.trash", "The pages in the trash, newest deletion first, without bodies, each "
                        + "with `id`, `deletedAt`, `deletedBy` and `purgeAfter`. Editors and owners only.",
                        (account, project) -> lifecycle.trash(account, project)),
                idOperation("docs.restore", "Brings a trashed page back to its path (its `id` from docs.trash or "
                        + "docs.delete). `doc_path_taken` when a page has taken the path since.",
                        (caller, projectId, id) -> lifecycle.restore(caller.accountId(), projectId, id,
                                caller.actor())),
                idOperation("docs.purge", "Deletes a trashed page for good, ahead of the 30 days. Not undoable.",
                        (caller, projectId, id) -> {
                            lifecycle.purge(caller.accountId(), projectId, id, caller.actor());
                            return Map.of("purged", true);
                        }));
    }

    private interface PageAction {
        Object run(UUID accountId, UUID projectId, String path,
                Actor actor);
    }

    private interface ProjectList {
        Object list(UUID accountId, UUID projectId);
    }

    private interface IdAction {
        Object run(OfficiumCaller caller, UUID projectId, UUID id);
    }

    private static McpOperation<OfficiumCaller> pageOperation(String key, String summary, PageAction action) {
        return new McpOperation<>(key, summary, McpOperation.WRITE, "officium:write",
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string()),
                        List.of("projectId", "path")),
                Map.of("projectId", EX_PROJECT, "path", "procedures/deploy"),
                (caller, params) -> action.run(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "path"), caller.actor()));
    }

    private static McpOperation<OfficiumCaller> listOperation(String key, String summary, ProjectList list) {
        return new McpOperation<>(key, summary, McpOperation.READ, "officium:read",
                McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> list.list(caller.accountId(), McpParams.uuid(params, "projectId")));
    }

    private static McpOperation<OfficiumCaller> idOperation(String key, String summary, IdAction action) {
        return new McpOperation<>(key, summary, McpOperation.WRITE, "officium:write",
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "id", McpSchemas.string()),
                        List.of("projectId", "id")),
                Map.of("projectId", EX_PROJECT, "id", EX_PAGE),
                (caller, params) -> action.run(caller, McpParams.uuid(params, "projectId"),
                        McpParams.uuid(params, "id")));
    }
}
