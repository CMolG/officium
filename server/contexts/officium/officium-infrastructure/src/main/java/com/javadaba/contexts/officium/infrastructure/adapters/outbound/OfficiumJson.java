package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.ActorKind;
import com.javadaba.contexts.officium.domain.AnsweredQuestion;
import com.javadaba.contexts.officium.domain.Assignee;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * {@code actor}/{@code assignees} jsonb columns, read and written through Jackson's TREE model on
 * purpose -- not {@code readValue(json, Actor.class)} -- so nothing here relies on
 * reflection-based record deserialization (invariant 8: "every reflection-based deserialization
 * needs explicit registration"; tree-model access is name-based, not reflective, same choice
 * {@code FirebaseUserDirectory} made for the same reason).
 */
final class OfficiumJson {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private OfficiumJson() {
    }

    static String writeActors(List<Actor> actors) {
        ArrayNode array = MAPPER.createArrayNode();
        for (Actor actor : actors) {
            try {
                array.add(MAPPER.readTree(writeActor(actor)));
            } catch (Exception impossible) {
                throw new IllegalStateException("Unable to write an actor", impossible);
            }
        }
        return array.toString();
    }

    static List<Actor> readActors(String json) {
        List<Actor> actors = new ArrayList<>();
        try {
            for (JsonNode node : MAPPER.readTree(json == null ? "[]" : json)) {
                actors.add(readActor(node.toString()));
            }
        } catch (Exception unreadable) {
            throw new IllegalStateException("Unable to read the actors " + json, unreadable);
        }
        return actors;
    }

    static String writeActor(Actor actor) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("kind", actor.kind().name());
        node.put("accountId", actor.accountId().toString());
        node.put("name", actor.name());
        if (actor.agentName() != null) {
            node.put("agentName", actor.agentName());
        }
        if (actor.machine() != null) {
            node.put("machine", actor.machine());
        }
        return node.toString();
    }

    static Actor readActor(String json) {
        try {
            JsonNode node = MAPPER.readTree(json);
            ActorKind kind = ActorKind.valueOf(node.path("kind").asText());
            UUID accountId = UUID.fromString(node.path("accountId").asText());
            String name = node.path("name").asText();
            String agentName = node.hasNonNull("agentName") ? node.path("agentName").asText() : null;
            String machine = node.hasNonNull("machine") ? node.path("machine").asText() : null;
            return new Actor(kind, accountId, name, agentName, machine);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to read actor json: " + json, ex);
        }
    }

    /** A card form's answers: the value is whatever the form runtime keeps (text, boolean, number, list of strings). */
    static String writeAnswers(List<AnsweredQuestion> answers) {
        ArrayNode array = MAPPER.createArrayNode();
        for (AnsweredQuestion answer : answers) {
            ObjectNode node = array.addObject();
            node.put("questionId", answer.questionId());
            node.put("prompt", answer.prompt());
            Object value = answer.value();
            if (value instanceof Boolean flag) {
                node.put("value", flag);
            } else if (value instanceof Long number) {
                node.put("value", number);
            } else if (value instanceof Number number) {
                node.put("value", number.doubleValue());
            } else if (value instanceof List<?> list) {
                ArrayNode items = node.putArray("value");
                list.forEach(item -> items.add(String.valueOf(item)));
            } else if (value != null) {
                node.put("value", String.valueOf(value));
            }
        }
        return array.toString();
    }

    static List<AnsweredQuestion> readAnswers(String json) {
        try {
            List<AnsweredQuestion> result = new ArrayList<>();
            for (JsonNode node : MAPPER.readTree(json == null || json.isBlank() ? "[]" : json)) {
                result.add(new AnsweredQuestion(node.path("questionId").asText(), node.path("prompt").asText(),
                        value(node.path("value"))));
            }
            return result;
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to read answers json: " + json, ex);
        }
    }

    private static Object value(JsonNode node) {
        if (node.isBoolean()) {
            return node.asBoolean();
        }
        if (node.isIntegralNumber()) {
            return node.asLong();
        }
        if (node.isNumber()) {
            return node.asDouble();
        }
        if (node.isArray()) {
            List<String> items = new ArrayList<>();
            node.forEach(item -> items.add(item.asText()));
            return items;
        }
        return node.isMissingNode() || node.isNull() ? null : node.asText();
    }

    static String writeAssignees(List<Assignee> assignees) {
        ArrayNode array = MAPPER.createArrayNode();
        for (Assignee assignee : assignees) {
            ObjectNode node = array.addObject();
            if (assignee.accountId() != null) {
                node.put("accountId", assignee.accountId().toString());
            }
            node.put("name", assignee.name());
        }
        return array.toString();
    }

    static List<Assignee> readAssignees(String json) {
        try {
            JsonNode array = MAPPER.readTree(json == null || json.isBlank() ? "[]" : json);
            List<Assignee> result = new ArrayList<>();
            for (JsonNode node : array) {
                UUID accountId = node.hasNonNull("accountId") ? UUID.fromString(node.path("accountId").asText()) : null;
                result.add(new Assignee(accountId, node.path("name").asText()));
            }
            return result;
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to read assignees json: " + json, ex);
        }
    }
}
