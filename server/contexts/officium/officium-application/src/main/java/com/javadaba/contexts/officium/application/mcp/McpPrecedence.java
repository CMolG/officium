package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.PrecedenceInput;
import com.javadaba.contexts.officium.application.PrecedenceService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.PrecedenceRule;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;
import com.javadaba.platform.mcp.McpToolException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The precedence list (ADR 0032, JAVA-1686): {@code projects.precedence}, {@code projects.setPrecedence} and
 * {@code projects.previewPrecedence}, out of {@link OfficiumMcpRegistry} at its allowance.
 */
final class McpPrecedence {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String EX_RULE_ID = "22222222-2222-2222-2222-222222222222";
    private static final String READ = McpOperation.READ;
    private static final String WRITE = McpOperation.WRITE;
    private static final String SCOPE_READ = "officium:read";
    private static final String SCOPE_WRITE = "officium:write";
    private static final Map<String, Object> EX_RULE = Map.of("name", "Launch",
            "reason", "The launch outranks the rest of the backlog",
            "match", Map.of("epics", List.of("LAUNCH")),
            "defaults", Map.of("priority", "high", "sprint", "join"));

    private McpPrecedence() {
    }

    static List<McpOperation<OfficiumCaller>> operations(PrecedenceService precedence) {
        return List.of(
                new McpOperation<>("projects.precedence",
                        "Which cards outrank the rest in this project: the rules in order. The first rule a card "
                                + "matches ranks it, and cards.next hands those cards first. Each rule has its "
                                + "`openMatches` and `dormant` (its epics are all closed); a card's `precedence` "
                                + "names its rule. `unknown` lists the categories or signals the project removed since a "
                                + "rule was saved: they match nothing and cannot be saved again. `version` is what "
                                + "projects.setPrecedence expects (0: never set). Any member reads it.",
                        READ, SCOPE_READ,
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                        Map.of("projectId", EX_PROJECT),
                        (caller, params) -> precedence.get(caller.accountId(), McpParams.uuid(params, "projectId"))),
                new McpOperation<>("projects.setPrecedence",
                        "(Owner only) Replaces the project's whole list of precedence rules, in order, at most 20. "
                                + "Each rule is {name, reason, match: {epics?, tags?, categories?, signals?}, "
                                + "defaults?: {priority?, sprint?: \"none\" | \"join\"}}. The match names at least one "
                                + "facet: a card matches a facet by any of its values, and a rule by every facet it "
                                + "names. `epics` are the keys or labels of the project's epics. `defaults.priority` "
                                + "is a floor a new or moved card is raised to, never lowered; an explicit priority "
                                + "wins. `join` plants the card in the active sprint. `expectedVersion` is the one "
                                + "projects.precedence returned.",
                        WRITE, SCOPE_WRITE,
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer(), "rules", McpSchemas.array(McpSchemas.object())),
                                List.of("projectId", "expectedVersion", "rules")),
                        Map.of("projectId", EX_PROJECT, "expectedVersion", 0, "rules", List.of(EX_RULE)),
                        (caller, params) -> precedence.set(caller.accountId(), McpParams.uuid(params, "projectId"),
                                rules(params.path("rules")), McpParams.integer(params, "expectedVersion", 0),
                                caller.actor())),
                new McpOperation<>("projects.previewPrecedence",
                        "What an unsaved rule would catch in this project: its `openMatches`, a few of their "
                                + "`sampleKeys`, and its `refusals`. Nothing is saved.",
                        READ, SCOPE_READ,
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "rule", McpSchemas.object()),
                                List.of("projectId", "rule")),
                        Map.of("projectId", EX_PROJECT, "rule", EX_RULE),
                        (caller, params) -> precedence.preview(caller.accountId(),
                                McpParams.uuid(params, "projectId"), rule(0, params.path("rule")))),
                new McpOperation<>("projects.previewPrecedenceBackfill",
                        "The cards a saved rule would bring into the active sprint (a `join` rule): the open cards it "
                                + "ranks that sit outside the active sprint, in card-number order, with `count`, the "
                                + "`sprint` they would join, and each card's current `sprint` (null: the backlog). "
                                + "`version` is what projects.applyPrecedenceBackfill expects. Nothing is saved.",
                        READ, SCOPE_READ,
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "ruleId", McpSchemas.string()),
                                List.of("projectId", "ruleId")),
                        Map.of("projectId", EX_PROJECT, "ruleId", EX_RULE_ID),
                        (caller, params) -> precedence.backfillPreview(caller.accountId(),
                                McpParams.uuid(params, "projectId"), McpParams.uuid(params, "ruleId"))),
                new McpOperation<>("projects.applyPrecedenceBackfill",
                        "(Owner only) Moves the open cards a saved `join` rule ranks into the active sprint, as "
                                + "projects.previewPrecedenceBackfill lists them, and writes each one's history. "
                                + "Epics, done, rejected and deploy cards are left alone; a second apply moves none. "
                                + "`expectedVersion` is the `version` the preview returned.",
                        WRITE, SCOPE_WRITE,
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "ruleId", McpSchemas.string(),
                                "expectedVersion", McpSchemas.integer()),
                                List.of("projectId", "ruleId", "expectedVersion")),
                        Map.of("projectId", EX_PROJECT, "ruleId", EX_RULE_ID, "expectedVersion", 0),
                        (caller, params) -> precedence.backfillApply(caller.accountId(),
                                McpParams.uuid(params, "projectId"), McpParams.uuid(params, "ruleId"),
                                McpParams.integer(params, "expectedVersion", 0), caller.actor())),
                new McpOperation<>("projects.precedenceTemplates",
                        "The precedence-rule templates the Fluxor market offers: ready-made lists such as a release "
                                + "train or compliance first. Each has the `presetKey` and `presetVersion` it comes "
                                + "from, an `id`, a `title`, the `placeholders` to fill ({key, label}: an epic's key "
                                + "or label, say) and the `rules` it would add, with `{{KEY}}` where a placeholder "
                                + "goes. Nothing is saved: projects.importPrecedenceTemplate adds one. Any member reads.",
                        READ, SCOPE_READ,
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                        Map.of("projectId", EX_PROJECT),
                        (caller, params) -> Map.of("templates",
                                precedence.templates(caller.accountId(), McpParams.uuid(params, "projectId")))),
                new McpOperation<>("projects.importPrecedenceTemplate",
                        "(Owner only) Adds a template's rules after the project's own, never replacing them, with "
                                + "`values` filling its placeholders ({KEY: \"an epic of this project\"}). The result is "
                                + "projects.setPrecedence's: the whole list at its new version. The same limits apply "
                                + "(20 rules, a name once, only epics the project has), and `expectedVersion` is the "
                                + "one projects.precedence returned.",
                        WRITE, SCOPE_WRITE,
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer(), "presetKey", McpSchemas.string(), "templateId",
                                McpSchemas.string(), "values", McpSchemas.object()),
                                List.of("projectId", "expectedVersion", "presetKey", "templateId")),
                        Map.of("projectId", EX_PROJECT, "expectedVersion", 0, "presetKey", "officium",
                                "templateId", "release-train", "values", Map.of("RELEASE_EPIC", "LAUNCH")),
                        (caller, params) -> precedence.importTemplate(caller.accountId(),
                                McpParams.uuid(params, "projectId"), params.path("presetKey").asText(),
                                params.path("templateId").asText(), values(params.path("values")),
                                McpParams.integer(params, "expectedVersion", 0), caller.actor())));
    }

    /** The placeholder values of an import, as sent: a flat object of strings. */
    static Map<String, String> values(JsonNode node) {
        Map<String, String> values = new java.util.LinkedHashMap<>();
        node.fields().forEachRemaining(entry -> values.put(entry.getKey(), entry.getValue().asText()));
        return values;
    }

    /** The rules of {@code projects.setPrecedence}, as the list was sent. */
    static List<PrecedenceRule> rules(JsonNode array) {
        if (!array.isArray()) {
            throw McpToolException.invalid("rules must be an array", "/rules");
        }
        List<PrecedenceRule> rules = new ArrayList<>();
        for (int i = 0; i < array.size(); i++) {
            rules.add(rule(i, array.get(i)));
        }
        return rules;
    }

    private static PrecedenceRule rule(int index, JsonNode node) {
        if (!node.isObject()) {
            throw McpToolException.invalid("a rule must be an object", "/rules/" + index);
        }
        JsonNode match = node.path("match");
        JsonNode defaults = node.path("defaults");
        return PrecedenceInput.rule(index, id(node), text(node, "name"), text(node, "reason"),
                strings(match, "epics"), strings(match, "tags"), strings(match, "categories"),
                strings(match, "signals"), text(defaults, "priority"), text(defaults, "sprint"));
    }

    private static UUID id(JsonNode node) {
        if (!node.hasNonNull("id")) {
            return null;
        }
        try {
            return UUID.fromString(node.get("id").asText());
        } catch (IllegalArgumentException ex) {
            throw McpToolException.invalid("id must be a UUID", "/id");
        }
    }

    private static String text(JsonNode node, String key) {
        return node.hasNonNull(key) ? node.get(key).asText() : null;
    }

    private static List<String> strings(JsonNode node, String key) {
        if (!node.hasNonNull(key)) {
            return null;
        }
        List<String> values = new ArrayList<>();
        node.get(key).forEach(value -> values.add(value.asText()));
        return values;
    }
}
