package com.javadaba.contexts.officium.domain;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Where a delivery's quality failed (card://JAVA-1525): the five engineering dimensions a reviewer audits, each
 * with its closed list of rules, and {@link #FUNCTIONAL}, a corrective card's dimension when the work simply did
 * not do what it should and no engineering rule names it. The rule ids are the vocabulary of {@link QualityRule}.
 */
public enum QualityDimension {
    ARCHITECTURE("architecture", "Architecture", List.of("layer-violation", "cross-context-leak",
            "adr-non-compliance", "circular-dependency", "anemic-or-leaked-model")), CLEAN_CODE(
                    "clean_code", "Clean code",
                    List.of("solid-srp", "solid-ocp-dip", "high-complexity", "dry-violation",
                            "poor-naming", "type-safety-bypass", "dead-code")), TESTING_RIGOR("testing_rigor",
                                    "Testing rigor", List.of("tautological-test", "missing-edge-cases",
                                            "broken-invariants", "excessive-mocking")), UX_AND_POLISH("ux_and_polish",
                                                    "UX and polish",
                                                    List.of("unpolished-interaction", "visual-inconsistency",
                                                            "layout-or-responsive-flaw",
                                                            "missing-feedback-states")), RUNTIME_GUARDRAILS(
                                                                    "runtime_guardrails", "Security and performance",
                                                                    List.of("n-plus-one-query",
                                                                            "unbounded-payload",
                                                                            "concurrency-version-ignored",
                                                                            "auth-or-permission-gap")), FUNCTIONAL(
                                                                                    "functional", "Functional",
                                                                                    List.of());

    private final String wire;
    private final String label;
    private final List<String> rules;

    QualityDimension(String wire, String label, List<String> rules) {
        this.wire = wire;
        this.label = label;
        this.rules = rules;
    }

    public String wire() {
        return wire;
    }

    public String label() {
        return label;
    }

    /** The rule ids of this dimension, without the dimension prefix. */
    public List<String> rules() {
        return rules;
    }

    /** Whether a reviewer scores this dimension: every one but {@link #FUNCTIONAL}, which has no rules. */
    public boolean reviewed() {
        return this != FUNCTIONAL;
    }

    /** The dimensions a review scores, in their order. */
    public static List<QualityDimension> reviewedDimensions() {
        return Arrays.stream(values()).filter(QualityDimension::reviewed).toList();
    }

    public static QualityDimension fromWire(String value) {
        return find(value).orElseThrow(() -> OfficiumException.badRequest("quality_dimension_invalid",
                "Unknown quality dimension: " + value + ". One of: " + wires()));
    }

    public static java.util.Optional<QualityDimension> find(String value) {
        return Arrays.stream(values()).filter(d -> d.wire.equals(value)).findFirst();
    }

    public static String wires() {
        return Arrays.stream(values()).map(QualityDimension::wire).collect(Collectors.joining(", "));
    }
}
