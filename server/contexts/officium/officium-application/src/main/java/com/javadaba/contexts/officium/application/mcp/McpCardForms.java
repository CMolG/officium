package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.CardFormService;
import com.javadaba.contexts.officium.domain.ports.CardForms;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * A card form over the MCP: its JSON schema and its params-to-spec mapping, shared by
 * {@code cards.create}, {@code cards.requestHuman} and {@code cards.attachForm}. Its own class since
 * JAVA-1082 gave forms their languages: {@link OfficiumMcpRegistry} is at its size allowance.
 */
final class McpCardForms {

    private McpCardForms() {
    }

    static Map<String, Object> formSchema() {
        return McpSchemas.objectOf(formFields(), List.of("questions"));
    }

    /** cards.attachForm's params: the card, then the form's own fields at the top level. */
    static Map<String, Object> attachFormProperties() {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("projectId", McpSchemas.string());
        props.put("keyOrId", McpSchemas.string());
        props.putAll(formFields());
        return props;
    }

    /** The form's own fields, shared by the `form` of create/requestHuman and attachForm's top level. */
    static Map<String, Object> formFields() {
        Map<String, Object> logic = new LinkedHashMap<>();
        logic.put("questionId", McpSchemas.string());
        logic.put("op", McpSchemas.stringEnum("EQUALS", "IN", "ANSWERED"));
        logic.put("value", McpSchemas.array(McpSchemas.string()));
        logic.put("goTo", McpSchemas.string());
        Map<String, Object> text = new LinkedHashMap<>();
        text.put("prompt", McpSchemas.string());
        text.put("help", McpSchemas.string());
        text.put("options", McpSchemas.array(McpSchemas.string()));
        Map<String, Object> question = new LinkedHashMap<>();
        question.put("id", McpSchemas.string());
        question.put("kind", McpSchemas.stringEnum("STATEMENT", "TEXT", "LONG_TEXT", "YES_NO", "CHOICE",
                "MULTI_CHOICE", "RATING", "NPS", "EMAIL", "NUMBER", "DATE"));
        question.put("prompt", McpSchemas.string());
        question.put("help", McpSchemas.string());
        question.put("required", McpSchemas.bool());
        question.put("options", McpSchemas.array(McpSchemas.string()));
        question.put("logic", McpSchemas.array(McpSchemas.objectOf(logic, List.of("questionId", "op", "goTo"))));
        // JAVA-1082: the question's text in each of the form's other languages, by language code.
        question.put("translations", Map.of("type", "object", "additionalProperties",
                McpSchemas.objectOf(text, List.of("prompt"))));
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("title", McpSchemas.string());
        fields.put("languages", McpSchemas.array(McpSchemas.string()));
        fields.put("questions", McpSchemas.array(McpSchemas.objectOf(question, List.of("id", "kind", "prompt"))));
        return fields;
    }

    /**
     * A form spec from params: {@code title} (the card's own when left out), its {@code languages}
     * (the project's when left out, JAVA-1082) and its {@code questions}, each with its
     * {@code translations}.
     */
    static CardFormService.FormSpec toFormSpec(JsonNode node) {
        List<CardForms.QuestionDraft> questions = new ArrayList<>();
        if (node.hasNonNull("questions")) {
            for (JsonNode q : node.get("questions")) {
                questions.add(new CardForms.QuestionDraft(McpParams.requiredString(q, "id"),
                        McpParams.requiredString(q, "kind"), McpParams.requiredString(q, "prompt"),
                        McpParams.string(q, "help", null), Boolean.TRUE.equals(McpParams.bool(q, "required", false)),
                        McpParams.stringArray(q, "options"), logic(q), translations(q)));
            }
        }
        List<String> languages = node.hasNonNull("languages") ? McpParams.stringArray(node, "languages") : null;
        return new CardFormService.FormSpec(McpParams.string(node, "title", null), questions, languages);
    }

    private static List<CardForms.Logic> logic(JsonNode q) {
        List<CardForms.Logic> logic = new ArrayList<>();
        if (q.hasNonNull("logic")) {
            for (JsonNode rule : q.get("logic")) {
                logic.add(new CardForms.Logic(McpParams.requiredString(rule, "questionId"),
                        McpParams.requiredString(rule, "op"), McpParams.stringArray(rule, "value"),
                        McpParams.requiredString(rule, "goTo")));
            }
        }
        return logic;
    }

    private static Map<String, CardForms.Text> translations(JsonNode q) {
        Map<String, CardForms.Text> out = new LinkedHashMap<>();
        if (q.hasNonNull("translations")) {
            q.get("translations").fields().forEachRemaining(entry -> out.put(entry.getKey(),
                    new CardForms.Text(McpParams.string(entry.getValue(), "prompt", null),
                            McpParams.string(entry.getValue(), "help", null),
                            McpParams.stringArray(entry.getValue(), "options"))));
        }
        return out;
    }
}
