package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.ChangelogService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * The documentation changelog (contract section 8.8), moved out of {@link OfficiumMcpRegistry} at its allowance, like
 * {@link McpProjectStandards}.
 */
final class McpChangelog {

    private static final String READ = McpOperation.READ;
    private static final String WRITE = McpOperation.WRITE;
    private static final String SCOPE_READ = "officium:read";
    private static final String SCOPE_WRITE = "officium:write";
    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String EX_CARD = "22222222-2222-2222-2222-222222222222";

    private McpChangelog() {
    }

    /** JAVA-132 (contract §8.8): the documentation's drift control, which a backlog session clears --
     *  read what reached main, then say what the docs did about each change. The pipeline token is
     *  web-only on purpose: a secret never passes through an agent. */
    static List<McpOperation<OfficiumCaller>> operations(ChangelogService changelog) {
        List<McpOperation<OfficiumCaller>> list = new ArrayList<>();
        list.add(new McpOperation<>("docs.changelog.list",
                "The changes that reached main, newest first, each with what the docs did about it: `pending` "
                        + "(nobody has said yet), `reviewed` (no page needed changing) or `updated` (with the "
                        + "pages). Pass `status: \"pending\"` for what is left to clear; `pendingCount` is always "
                        + "the project's total.",
                READ, SCOPE_READ,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "status",
                        McpSchemas.stringEnum("pending", "reviewed", "updated"), "limit", McpSchemas.integer()),
                        List.of("projectId")),
                Map.of("projectId", EX_PROJECT, "status", "pending"),
                (caller, params) -> changelog.list(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.string(params, "status", null), McpParams.integer(params, "limit", null))));

        list.add(new McpOperation<>("docs.changelog.mark",
                "Says what the docs did about one change: `reviewed` when no page needed it, `updated` with "
                        + "the `pages` (paths from docs.list) you changed for it, or `pending` to reopen it. Read "
                        + "the change first; `expectedVersion` is its version, and a stale one answers "
                        + "`version_conflict` with `current`.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "entryId", McpSchemas.string(),
                        "status", McpSchemas.stringEnum("pending", "reviewed", "updated"),
                        "pages", McpSchemas.array(McpSchemas.string()), "expectedVersion", McpSchemas.integer()),
                        List.of("projectId", "entryId", "status", "expectedVersion")),
                Map.of("projectId", EX_PROJECT, "entryId", EX_CARD, "status", "updated",
                        "pages", List.of("procedures/deploy"), "expectedVersion", 1),
                (caller, params) -> changelog.mark(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.uuid(params, "entryId"), McpParams.requiredString(params, "status"),
                        McpParams.stringArray(params, "pages"), McpParams.integer(params, "expectedVersion", 0),
                        caller.actor())));

        list.add(new McpOperation<>("docs.changelog.record",
                "Records a change that reached main by hand, as pending. The project's pipeline normally does "
                        + "this on every merge; `ref` (the commit sha) makes it idempotent, so recording one the "
                        + "pipeline already did answers the existing entry.",
                WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "ref", McpSchemas.string(), "title",
                        McpSchemas.string(), "url", McpSchemas.string(), "areas", McpSchemas.array(McpSchemas.string()),
                        "mergedAt", McpSchemas.string()), List.of("projectId", "ref", "title")),
                Map.of("projectId", EX_PROJECT, "ref", "9b16e595", "title", "feat(officium): documentation pages",
                        "areas", List.of("javadaba-api/contexts/officium")),
                (caller, params) -> {
                    String mergedAt = McpParams.string(params, "mergedAt", null);
                    return changelog.record(caller.accountId(), McpParams.uuid(params, "projectId"),
                            new ChangelogService.Change(McpParams.requiredString(params, "ref"),
                                    McpParams.requiredString(params, "title"), McpParams.string(params, "url", null),
                                    McpParams.stringArray(params, "areas"),
                                    mergedAt == null ? null : OfficiumMcpRegistry.instant(mergedAt)),
                            caller.actor()).entry();
                }));
        return list;
    }
}
