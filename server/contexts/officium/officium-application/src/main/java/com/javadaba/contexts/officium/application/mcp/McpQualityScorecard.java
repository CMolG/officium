package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.domain.QualityDimension;
import com.javadaba.contexts.officium.domain.ReviewQuality;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** {@code cards.move}'s {@code qualityScorecard} (card://JAVA-1526): its schema, and its read into the domain's map. */
final class McpQualityScorecard {

    private McpQualityScorecard() {
    }

    static Map<String, Object> schema() {
        Map<String, Object> properties = new LinkedHashMap<>();
        Map<String, Object> score = McpSchemas.stringEnum("clean", "minor_observations");
        QualityDimension.reviewedDimensions().forEach(dimension -> properties.put(dimension.wire(), score));
        properties.put(ReviewQuality.OBSERVATIONS, McpSchemas.string());
        properties.put(ReviewQuality.ROLE, McpSchemas.string());
        return McpSchemas.objectOf(properties, List.of());
    }

    /** Every field as text, so an unknown dimension reaches the domain and is refused there in words. */
    static Map<String, String> read(JsonNode raw) {
        if (!raw.isObject()) {
            return null;
        }
        Map<String, String> scorecard = new LinkedHashMap<>();
        raw.fields().forEachRemaining(field -> scorecard.put(field.getKey(), field.getValue().asText()));
        return scorecard;
    }
}
