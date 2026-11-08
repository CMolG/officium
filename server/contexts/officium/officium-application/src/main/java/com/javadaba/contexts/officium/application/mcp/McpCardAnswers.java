package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.javadaba.contexts.officium.application.AgentWorkView;
import com.javadaba.contexts.officium.application.CardDetailView;
import com.javadaba.contexts.officium.application.CardFormView;
import com.javadaba.contexts.officium.application.CardRequestService.CardRequestView;
import com.javadaba.contexts.officium.application.CardView;
import com.javadaba.contexts.officium.application.TimeEntryView;
import com.javadaba.contexts.officium.application.WorkPick;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.CardComment;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The size of the card answers over MCP (JDB-1589). A write answers its card, comment, time entry,
 * work entry, request or form short: the key fields plus what the write itself produced. {@code cards.get}
 * keeps the card and its last comments, and {@code cards.next} leaves out the body a pick reads once with
 * {@code cards.get}. {@code view: "full"} returns what the operation answered before. One wrapper over the
 * finished table, so the registry takes one line; REST is not touched.
 */
final class McpCardAnswers {

    private static final ObjectMapper MAPPER = new ObjectMapper().registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    private static final int RECENT_COMMENTS = 3;
    private static final String VIEW_SENTENCE = " `view` is \"short\" by default: the answer is the key fields of "
            + "what the call touched, and \"full\" answers what it answered before.";

    /** The card fields every short card answer keeps, the hook's bytes first (officium-temporary-refs). */
    private static final List<String> CARD_BASE = List.of("id", "projectId", "key", "status", "version", "updatedAt");
    private static final Map<String, List<String>> CARD_EXTRAS = Map.of(
            "cards.link", List.of("related", "blocks", "blockedBy"),
            "cards.unlink", List.of("related", "blocks", "blockedBy"),
            "cards.move", List.of("blocks"),
            "cards.setRunState", List.of("runState"),
            "cards.setSprint", List.of("sprintId"),
            "cards.setWorkflow", List.of("workflow"),
            "cards.setExecutor", List.of("executor"));

    /** The operations whose answer changes shape. {@code cards.queue} is not here: its answer is already short. */
    static final Set<String> SHAPED = Set.of("cards.get", "cards.next", "cards.unit", "cards.create", "cards.update",
            "cards.move", "cards.setRunState", "cards.setSprint", "cards.setWorkflow", "cards.setExecutor",
            "cards.link", "cards.unlink",
            "cards.requestHuman", "cards.acknowledgeHumanEdit", "cards.setActivelyWorking", "cards.reportStatus",
            "cards.comment", "cards.logTime", "cards.requestAction", "cards.attachForm");

    private McpCardAnswers() {
    }

    /** The table with its card operations shaped: each takes {@code view} and says so in its summary. */
    static List<McpOperation<OfficiumCaller>> shortened(List<McpOperation<OfficiumCaller>> operations) {
        return operations.stream().map(McpCardAnswers::shortenedOperation).toList();
    }

    private static McpOperation<OfficiumCaller> shortenedOperation(McpOperation<OfficiumCaller> op) {
        if (!SHAPED.contains(op.key())) {
            return op;
        }
        return new McpOperation<>(op.key(), op.summary() + VIEW_SENTENCE, op.mode(), op.scope(),
                withViewParameter(op.inputSchema()), op.example(), (caller, params) -> {
                    Object answer = op.handler().handle(caller, params);
                    return "full".equals(params.path("view").asText()) ? answer : shape(op.key(), answer);
                });
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> withViewParameter(Map<String, Object> schema) {
        Map<String, Object> properties = new LinkedHashMap<>((Map<String, Object>) schema.get("properties"));
        properties.put("view", McpSchemas.stringEnum("short", "full"));
        Map<String, Object> shaped = new LinkedHashMap<>(schema);
        shaped.put("properties", properties);
        return shaped;
    }

    private static Object shape(String key, Object answer) {
        return switch (key) {
            case "cards.get" -> answer instanceof CardDetailView detail ? detailAnswer(detail) : answer;
            case "cards.next", "cards.unit" -> answer instanceof WorkPick pick ? nextAnswer(pick) : answer;
            default -> shortAnswer(key, answer);
        };
    }

    private static Object shortAnswer(String key, Object answer) {
        return switch (answer) {
            case null -> null;
            case CardDetailView detail -> {
                ObjectNode card = cardAnswer(key, detail.card());
                if (detail.form() != null) {
                    card.set("form", pick(MAPPER.valueToTree(detail.form()), List.of("fillPath", "questionCount")));
                }
                yield card;
            }
            case CardView card -> cardAnswer(key, card);
            case AgentWorkView work -> pick(MAPPER.valueToTree(work), List.of("cardId", "cardKey", "updatedAt",
                    "expiresAt"));
            case CardComment comment -> pick(MAPPER.valueToTree(comment), List.of("id", "cardId", "parentId",
                    "createdAt"));
            case TimeEntryView entry -> pick(MAPPER.valueToTree(entry), List.of("id", "cardKey", "date", "hours"));
            case CardRequestView request -> pick(MAPPER.valueToTree(request), List.of("id", "cardKey", "status"));
            case CardFormView form -> pick(MAPPER.valueToTree(form), List.of("formId", "fillPath", "questionCount",
                    "state"));
            case Map<?, ?> result when result.get("work") instanceof AgentWorkView work -> {
                Map<String, Object> shaped = new LinkedHashMap<>();
                shaped.put("activelyWorking", result.get("activelyWorking"));
                shaped.put("work", shortAnswer(key, work));
                yield shaped;
            }
            case List<?> items -> items.stream().map(item -> shortAnswer(key, item)).toList();
            default -> answer;
        };
    }

    private static ObjectNode cardAnswer(String key, CardView card) {
        ObjectNode node = MAPPER.valueToTree(card);
        List<String> fields = new ArrayList<>(CARD_BASE);
        for (String extra : CARD_EXTRAS.getOrDefault(key, List.of())) {
            if (!isEmpty(node.get(extra))) {
                fields.add(extra);
            }
        }
        return pick(node, fields);
    }

    /** {@code cards.get}: the whole card, its last comments, and how many were left out. */
    private static ObjectNode detailAnswer(CardDetailView detail) {
        ObjectNode out = MAPPER.valueToTree(detail.card());
        List<CardComment> comments = detail.comments();
        int omittedComments = Math.max(0, comments.size() - RECENT_COMMENTS);
        out.set("comments", MAPPER.valueToTree(comments.subList(omittedComments, comments.size())));
        out.set("omitted", MAPPER.createObjectNode().put("comments", omittedComments)
                .put("timeEntries", detail.timeEntries().size()));
        out.set("attachments", MAPPER.valueToTree(detail.attachments()));
        out.set("development", MAPPER.valueToTree(detail.development()));
        out.set("epicChildren", MAPPER.valueToTree(detail.epicChildren()));
        out.set("epicChildrenOpen", MAPPER.valueToTree(detail.epicChildrenOpen()));
        out.set("checkpoints", MAPPER.valueToTree(detail.checkpoints()));
        out.set("checkpointProgress", MAPPER.valueToTree(detail.card().checkpointProgress()));
        out.set("form", MAPPER.valueToTree(detail.form()));
        return out;
    }

    /** {@code cards.next}: the card a pick needs, and its sweep; its body is read once, with {@code cards.get}. */
    private static ObjectNode nextAnswer(WorkPick pick) {
        ObjectNode node = MAPPER.valueToTree(pick);
        node.remove(List.of("description", "actionPlan"));
        return node;
    }

    private static ObjectNode pick(JsonNode node, List<String> fields) {
        ObjectNode out = MAPPER.createObjectNode();
        node.fields().forEachRemaining(field -> {
            if (fields.contains(field.getKey())) {
                out.set(field.getKey(), field.getValue());
            }
        });
        return out;
    }

    private static boolean isEmpty(JsonNode value) {
        return value == null || value.isNull() || (value.isArray() && value.isEmpty());
    }
}
