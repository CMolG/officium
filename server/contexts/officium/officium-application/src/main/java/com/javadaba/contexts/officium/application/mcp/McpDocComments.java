package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.DocCommentService;
import com.javadaba.contexts.officium.application.DocCommentService.State;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.DocQuote;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The comments of a documentation page (JAVA-797, contract §8.25), the MCP twin of
 * {@code …/docs/{path}/_comments} and {@code …/docs:comments}: an agent lists the threads a page or the
 * whole project has open, answers them, resolves them and reacts.
 */
final class McpDocComments {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String EX_COMMENT = "33333333-3333-3333-3333-333333333333";
    private static final int DEFAULT_LIMIT = 50;

    private McpDocComments() {
    }

    static List<McpOperation<OfficiumCaller>> operations(DocCommentService comments) {
        Map<String, Object> page = Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string());
        Map<String, Object> onComment = Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(),
                "commentId", McpSchemas.string());
        Map<String, Object> reaction = Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(),
                "commentId", McpSchemas.string(), "emoji", McpSchemas.string());
        Map<String, Object> commentExample = Map.of("projectId", EX_PROJECT, "path", "procedures/deploy",
                "commentId", EX_COMMENT);
        Map<String, Object> quote = McpSchemas.objectOf(Map.of("exact", McpSchemas.string(), "prefix",
                McpSchemas.string(), "suffix", McpSchemas.string()), List.of("exact"));
        return List.of(
                new McpOperation<>("docs.comments.list",
                        "The comment threads of a page, or with no `path` of every page you can see: the open ones "
                                + "newest activity first, so you can find what waits on an answer. `state` is `open` "
                                + "(default), `resolved` or `all`. A thread is `{id, path, pageTitle, quote|null, "
                                + "detached, resolvedAt, resolvedBy, comments: [first, ...replies]}`; `detached` means "
                                + "the quoted words are no longer on the page.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(),
                                "state", McpSchemas.string(), "limit", McpSchemas.integer()), List.of("projectId")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy"),
                        (caller, params) -> {
                            UUID projectId = McpParams.uuid(params, "projectId");
                            State state = State.parse(McpParams.string(params, "state", null));
                            String path = McpParams.string(params, "path", null);
                            return path == null
                                    ? comments.listProject(caller.accountId(), projectId, state,
                                            McpParams.integer(params, "limit", DEFAULT_LIMIT))
                                    : comments.list(caller.accountId(), projectId, path, state);
                        }),
                new McpOperation<>("docs.comments.add",
                        "Starts a thread or answers one (editor+). Give `quote.exact` to anchor a thread to words the "
                                + "page holds right now (`quote_not_found` otherwise); leave `quote` out for a "
                                + "page-level comment. Give `parentId` (a thread's first comment) to reply: a reply "
                                + "reopens a resolved thread, and replies to replies are refused. Answers the thread.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(),
                                "text", McpSchemas.string(), "quote", quote, "parentId", McpSchemas.string()),
                                List.of("projectId", "path", "text")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy", "text", "Why friday?"),
                        (caller, params) -> comments.add(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "path"), McpParams.requiredString(params, "text"),
                                quoteOf(params.get("quote")), McpParams.optionalUuid(params, "parentId"),
                                caller.actor())),
                new McpOperation<>("docs.comments.edit",
                        "Changes the text of your own comment (editor+). Answers the thread.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(withText(onComment), List.of("projectId", "path", "commentId", "text")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy", "commentId", EX_COMMENT,
                                "text", "Why on friday?"),
                        (caller, params) -> comments.edit(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "path"), McpParams.uuid(params, "commentId"),
                                McpParams.requiredString(params, "text"), caller.actor())),
                new McpOperation<>("docs.comments.delete",
                        "Deletes a comment (editor+): yours, or anyone's if you own the project. A first comment "
                                + "that has replies stays as \"Comment deleted\" so the replies keep their thread. "
                                + "Irreversible. Answers `{deleted, thread}`; `thread` is null when the thread went.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(onComment, List.of("projectId", "path", "commentId")), commentExample,
                        (caller, params) -> {
                            var thread = comments.delete(caller.accountId(), McpParams.uuid(params, "projectId"),
                                    McpParams.requiredString(params, "path"), McpParams.uuid(params, "commentId"),
                                    caller.actor());
                            Map<String, Object> answer = new LinkedHashMap<>();
                            answer.put("deleted", true);
                            answer.put("thread", thread);
                            return answer;
                        }),
                new McpOperation<>("docs.comments.resolve", "Marks a thread resolved (editor+). A reply reopens it.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(onComment, List.of("projectId", "path", "commentId")), commentExample,
                        (caller, params) -> comments.resolve(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "path"), McpParams.uuid(params, "commentId"),
                                caller.actor())),
                new McpOperation<>("docs.comments.unresolve", "Reopens a resolved thread (editor+).",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(onComment, List.of("projectId", "path", "commentId")), commentExample,
                        (caller, params) -> comments.unresolve(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "path"), McpParams.uuid(params, "commentId"),
                                caller.actor())),
                new McpOperation<>("docs.comments.react",
                        "Reacts to a comment with exactly one emoji (editor+); reacting twice with the same emoji "
                                + "changes nothing.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(reaction, List.of("projectId", "path", "commentId", "emoji")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy", "commentId", EX_COMMENT,
                                "emoji", "👍"),
                        (caller, params) -> comments.react(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "path"), McpParams.uuid(params, "commentId"),
                                McpParams.requiredString(params, "emoji"), caller.actor())),
                new McpOperation<>("docs.comments.unreact", "Takes back your reaction (editor+).",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(reaction, List.of("projectId", "path", "commentId", "emoji")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy", "commentId", EX_COMMENT,
                                "emoji", "👍"),
                        (caller, params) -> comments.unreact(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "path"), McpParams.uuid(params, "commentId"),
                                McpParams.requiredString(params, "emoji"), caller.actor())));
    }

    private static Map<String, Object> withText(Map<String, Object> base) {
        Map<String, Object> props = new LinkedHashMap<>(base);
        props.put("text", McpSchemas.string());
        return props;
    }

    private static DocQuote quoteOf(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        return new DocQuote(node.path("exact").asText(null), node.path("prefix").asText(""),
                node.path("suffix").asText(""));
    }
}
