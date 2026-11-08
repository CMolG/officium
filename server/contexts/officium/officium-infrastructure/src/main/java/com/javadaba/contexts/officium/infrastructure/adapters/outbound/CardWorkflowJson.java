package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.javadaba.contexts.officium.domain.CardWorkflow;

import java.util.Map;

/** A card's workflow as the jsonb column holds it (card://JAVA-1591). Null is no workflow. */
final class CardWorkflowJson {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private CardWorkflowJson() {
    }

    static String write(CardWorkflow workflow) {
        if (workflow == null) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(workflow.wire());
        } catch (JsonProcessingException impossible) {
            throw new IllegalStateException("Unable to write a card workflow", impossible);
        }
    }

    /** Leniently, like the signals: a document this version cannot read is no workflow, not a failed read. */
    static CardWorkflow read(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return CardWorkflow.readStored(MAPPER.readValue(json, Map.class));
        } catch (Exception unreadable) {
            return null;
        }
    }
}
