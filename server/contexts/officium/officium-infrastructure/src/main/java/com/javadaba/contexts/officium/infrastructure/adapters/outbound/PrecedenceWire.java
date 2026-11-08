package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.ActorKind;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.PrecedenceDefaults;
import com.javadaba.contexts.officium.domain.PrecedenceMatch;
import com.javadaba.contexts.officium.domain.PrecedenceRule;
import com.javadaba.contexts.officium.domain.PrecedenceSprint;
import com.javadaba.contexts.officium.domain.Signal;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;

/**
 * The JSON of a precedence list and of its last editor, read and written through the tree model (as the role
 * matrix does, so no reflective deserialization is needed in a native build).
 */
final class PrecedenceWire {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private PrecedenceWire() {
    }

    static String rules(List<PrecedenceRule> rules) {
        ArrayNode array = MAPPER.createArrayNode();
        rules.forEach(rule -> array.add(rule(rule)));
        return write(array);
    }

    static List<PrecedenceRule> readRules(String json) {
        List<PrecedenceRule> rules = new ArrayList<>();
        readTree(json).forEach(node -> rules.add(readRule(node)));
        return rules;
    }

    static String actor(Actor actor) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("kind", actor.kind().name());
        node.put("accountId", actor.accountId().toString());
        node.put("name", actor.name());
        putIfPresent(node, "agentName", actor.agentName());
        putIfPresent(node, "machine", actor.machine());
        return write(node);
    }

    static Actor readActor(String json) {
        JsonNode node = readTree(json);
        ActorKind kind = ActorKind.valueOf(node.get("kind").asText());
        String agentName = text(node, "agentName");
        String machine = text(node, "machine");
        return new Actor(kind, UUID.fromString(node.get("accountId").asText()), node.get("name").asText(),
                agentName, machine);
    }

    private static ObjectNode rule(PrecedenceRule rule) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("id", rule.id().toString());
        node.put("name", rule.name());
        node.put("reason", rule.reason());
        ObjectNode match = node.putObject("match");
        match.set("epics", strings(rule.match().epics()));
        match.set("tags", strings(rule.match().tags()));
        match.set("categories", strings(rule.match().categories().stream().map(Category::wire).toList()));
        match.set("signals", strings(rule.match().signals().stream().map(Signal::wire).toList()));
        ObjectNode defaults = node.putObject("defaults");
        putIfPresent(defaults, "priority", rule.defaults().priority() == null
                ? null
                : rule.defaults().priority().wire());
        defaults.put("sprint", rule.defaults().sprint().wire());
        return node;
    }

    private static PrecedenceRule readRule(JsonNode node) {
        JsonNode match = node.get("match");
        List<String> unknown = new ArrayList<>();
        PrecedenceMatch matched = new PrecedenceMatch(strings(match.get("epics")), strings(match.get("tags")),
                known(match.get("categories"), "categories", Category::fromWire, unknown),
                known(match.get("signals"), "signals", Signal::fromWire, unknown), unknown);
        JsonNode defaultsNode = node.get("defaults");
        String priority = text(defaultsNode, "priority");
        PrecedenceDefaults defaults = new PrecedenceDefaults(priority == null ? null : Priority.fromWire(priority),
                PrecedenceSprint.fromWire(defaultsNode.get("sprint").asText()));
        return new PrecedenceRule(UUID.fromString(node.get("id").asText()), node.get("name").asText(),
                node.get("reason").asText(), matched, defaults);
    }

    private static ArrayNode strings(List<String> values) {
        ArrayNode array = MAPPER.createArrayNode();
        values.forEach(array::add);
        return array;
    }

    private static List<String> strings(JsonNode array) {
        List<String> values = new ArrayList<>();
        array.forEach(value -> values.add(value.asText()));
        return values;
    }

    /**
     * The values the code still knows. A value it no longer knows is kept as {@code facet:value} in
     * {@code unknown}, never dropped: a rule left with no known value matches nothing (ADR 0032, JAVA-1686).
     */
    private static <T> List<T> known(JsonNode array, String facet, Function<String, T> parse, List<String> unknown) {
        List<T> known = new ArrayList<>();
        strings(array).forEach(value -> {
            try {
                known.add(parse.apply(value));
            } catch (OfficiumException ex) {
                unknown.add(facet + ":" + value);
            }
        });
        return known;
    }

    private static void putIfPresent(ObjectNode node, String field, String value) {
        if (value != null) {
            node.put(field, value);
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private static JsonNode readTree(String json) {
        try {
            return MAPPER.readTree(json);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unreadable precedence rules", ex);
        }
    }

    private static String write(JsonNode node) {
        try {
            return MAPPER.writeValueAsString(node);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to write precedence rules", ex);
        }
    }
}
