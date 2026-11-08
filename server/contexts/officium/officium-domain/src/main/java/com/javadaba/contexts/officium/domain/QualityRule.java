package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * One rule of the closed engineering-quality vocabulary (card://JAVA-1525), written {@code <dimension>:<rule>}
 * on the wire ({@code architecture:layer-violation}). A reviewer's send-back and a corrective card name rules
 * from this list only, so every review and every escaped defect is classified the same way.
 */
public record QualityRule(QualityDimension dimension, String rule) {

    public QualityRule {
        if (dimension == null || !dimension.rules().contains(rule)) {
            throw new IllegalArgumentException("Not a quality rule: " + dimension + ":" + rule);
        }
    }

    public String id() {
        return dimension.wire() + ":" + rule;
    }

    /** The rule with this id, or empty when the vocabulary has none. */
    public static Optional<QualityRule> find(String id) {
        if (id == null) {
            return Optional.empty();
        }
        int colon = id.indexOf(':');
        if (colon < 0) {
            return Optional.empty();
        }
        String rule = id.substring(colon + 1);
        return QualityDimension.find(id.substring(0, colon))
                .filter(dimension -> dimension.rules().contains(rule))
                .map(dimension -> new QualityRule(dimension, rule));
    }

    /**
     * The rules these ids name, each once, in the order given; refused with {@code quality_rule_unknown} naming
     * the first id the vocabulary does not have.
     */
    public static List<QualityRule> parseAll(List<String> ids) {
        List<QualityRule> rules = new ArrayList<>();
        for (String id : ids == null ? List.<String>of() : ids) {
            String stripped = id == null ? "" : id.strip();
            QualityRule rule = find(stripped).orElseThrow(() -> OfficiumException.badRequest("quality_rule_unknown",
                    "Unknown quality rule: " + stripped + ". Write <dimension>:<rule> from meta.states' qualityRules"));
            if (!rules.contains(rule)) {
                rules.add(rule);
            }
        }
        return rules;
    }

    /** The whole vocabulary, by dimension wire id: what {@code meta.states} serves as {@code qualityRules}. */
    public static Map<String, List<String>> vocabulary() {
        Map<String, List<String>> byDimension = new LinkedHashMap<>();
        Arrays.stream(QualityDimension.values()).filter(QualityDimension::reviewed)
                .forEach(dimension -> byDimension.put(dimension.wire(), dimension.rules()));
        return byDimension;
    }

    public static List<String> ids(List<QualityRule> rules) {
        return rules.stream().map(QualityRule::id).toList();
    }
}
