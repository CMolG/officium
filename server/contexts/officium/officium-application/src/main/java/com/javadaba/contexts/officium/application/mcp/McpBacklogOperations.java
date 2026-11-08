package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.backlog.BacklogImportExportService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * The backlog's Markdown twins, import and export (JDB-235, JAVA-1657). Their own class because
 * {@link OfficiumMcpRegistry} is at its size allowance. The export's files are the shape the import
 * takes, so an agent pipes one into the other.
 */
final class McpBacklogOperations {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpBacklogOperations() {
    }

    static List<McpOperation<OfficiumCaller>> operations(BacklogImportExportService backlog) {
        return List.of(
                new McpOperation<>("backlog.importMarkdown",
                        "Imports `.backlog/*.md`-shaped files into this project (JDB-235). Keeps task_id as the card key; "
                                + "HUMAN-prefixed/epic HUMAN/tag human becomes executor human.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(
                                Map.of("projectId", McpSchemas.string(), "files", McpSchemas.array(McpSchemas.objectOf(
                                        Map.of("name", McpSchemas.string(), "content", McpSchemas.string()),
                                        List.of("name", "content")))),
                                List.of("projectId", "files")),
                        Map.of("projectId", EX_PROJECT, "files", List.of(Map.of("name", "OFF-1.md", "content",
                                "---\ntask_id: OFF-1\npriority: medium\nstatus: todo\nrunState: idle\norder: 0\n"
                                        + "estimate: 0\ncreatedAt: 2026-01-01T00:00:00.000Z\n---\n# Imported\n\nBody."))),
                        (caller, params) -> {
                            List<BacklogImportExportService.BacklogFile> files = new ArrayList<>();
                            for (JsonNode item : params.get("files")) {
                                files.add(new BacklogImportExportService.BacklogFile(item.get("name").asText(),
                                        item.get("content").asText()));
                            }
                            return backlog.importMarkdown(caller.accountId(), McpParams.uuid(params, "projectId"),
                                    files,
                                    caller.actor());
                        }),
                new McpOperation<>("backlog.exportMarkdown",
                        "Exports the whole project's backlog as `{files:[{name, content}]}`: one `<CARD-KEY>.md` per card "
                                + "with its comments, links and plan, the shape backlog.importMarkdown takes. Every card "
                                + "in one answer, no paging; for one card, cards.get.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                        Map.of("projectId", EX_PROJECT),
                        (caller, params) -> Map.of("files", backlog.exportMarkdown(caller.accountId(),
                                McpParams.uuid(params, "projectId")).stream()
                                .map(f -> Map.of("name", f.name(), "content", f.content()))
                                .toList())));
    }
}
