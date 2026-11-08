package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A corrective card's lineage (card://JAVA-1525): the card that caused the defect it corrects, the phase of that
 * card that let it through, the quality dimension that failed and the rules it broke, read from four labeled lines
 * of its description. {@code causedBy} is the origin's key, or null for {@code Caused by: legacy} (a defect that
 * predates the registry, or whose card cannot be identified), which names no origin and needs no other line.
 */
public record QualityLineage(String causedBy, EscapedPhase escapedIn, QualityDimension dimension,
        List<QualityRule> rules) {

    public static final String CAUSED_BY_LINE = "Caused by:";
    public static final String ESCAPED_IN_LINE = "Escaped in:";
    public static final String QUALITY_DIMENSION_LINE = "Quality dimension:";
    public static final String VIOLATED_RULES_LINE = "Violated rules:";
    public static final String LEGACY = "legacy";
    public static final String NONE = "none";

    private static final Pattern CARD_KEY = Pattern.compile("[A-Z][A-Z0-9]{1,9}-[1-9][0-9]{0,8}");
    private static final Pattern RULE_SEPARATOR = Pattern.compile("[,;\\s]+");

    public QualityLineage {
        rules = rules == null ? List.of() : List.copyOf(rules);
    }

    /** Whether the lineage names an origin card, rather than {@code legacy}. */
    public boolean namesCard() {
        return causedBy != null;
    }

    /** The four lines as written in a description, each null when the description has none. */
    public record Lines(String causedBy, String escapedIn, String dimension, String violatedRules) {

        public boolean any() {
            return causedBy != null || escapedIn != null || dimension != null || violatedRules != null;
        }
    }

    public static Lines lines(String description) {
        return new Lines(value("Caused by", description), value("Escaped in", description),
                value("Quality dimension", description), value("Violated rules", description));
    }

    /**
     * The lineage these lines state, when they are complete and every value is in the vocabulary; empty otherwise.
     * Lenient on purpose: it is what is recorded, never a refusal ({@link #problems} is the refusal's text).
     */
    public static Optional<QualityLineage> parse(String description) {
        Lines lines = lines(description);
        return problems(lines, true).isEmpty() ? Optional.of(of(lines)) : Optional.empty();
    }

    /**
     * What to write so the lines state a lineage, each item a sentence; empty when they do. With {@code required}
     * false a description with no {@code Caused by:} line needs nothing.
     */
    public static List<String> problems(Lines lines, boolean required) {
        List<String> problems = new ArrayList<>();
        if (lines.causedBy() == null) {
            if (required) {
                problems.add("Add a description line `" + CAUSED_BY_LINE + " <KEY>` naming the card whose delivery "
                        + "introduced or approved the defect, or `" + CAUSED_BY_LINE + " " + LEGACY + "` when it "
                        + "predates the registry or no card can be identified.");
            }
            return problems;
        }
        String origin = firstWord(lines.causedBy());
        if (LEGACY.equalsIgnoreCase(origin)) {
            return problems;
        }
        if (!CARD_KEY.matcher(origin).matches()) {
            problems.add("The `" + CAUSED_BY_LINE + "` value `" + lines.causedBy() + "` is neither a card key nor `"
                    + LEGACY + "`.");
            return problems;
        }
        if (lines.escapedIn() == null || EscapedPhase.find(firstWord(lines.escapedIn())).isEmpty()) {
            problems.add("Add a description line `" + ESCAPED_IN_LINE + " " + EscapedPhase.wires() + "`: the phase of "
                    + origin + " that let it through (its plan, its implementation or its review).");
        }
        if (lines.dimension() == null || QualityDimension.find(firstWord(lines.dimension())).isEmpty()) {
            problems.add("Add a description line `" + QUALITY_DIMENSION_LINE + " <" + QualityDimension.wires()
                    + ">`: where the quality failed.");
        }
        problems.addAll(ruleProblems(lines.violatedRules()));
        return problems;
    }

    private static List<String> ruleProblems(String violatedRules) {
        if (violatedRules == null) {
            return List.of("Add a description line `" + VIOLATED_RULES_LINE + " <dimension>:<rule>, ...` from "
                    + "meta.states' qualityRules, or `" + VIOLATED_RULES_LINE + " " + NONE + "` for a purely "
                    + "functional failure.");
        }
        List<String> unknown = ruleIds(violatedRules).stream().filter(id -> QualityRule.find(id).isEmpty()).toList();
        return unknown.isEmpty()
                ? List.of()
                : List.of("Unknown quality rules in `" + VIOLATED_RULES_LINE + "`: " + String.join(", ", unknown)
                        + ". Write <dimension>:<rule> ids from meta.states' qualityRules.");
    }

    private static QualityLineage of(Lines lines) {
        String origin = firstWord(lines.causedBy());
        if (LEGACY.equalsIgnoreCase(origin)) {
            return new QualityLineage(null, null, null, List.of());
        }
        return new QualityLineage(origin, EscapedPhase.find(firstWord(lines.escapedIn())).orElseThrow(),
                QualityDimension.find(firstWord(lines.dimension())).orElseThrow(),
                QualityRule.parseAll(ruleIds(lines.violatedRules())));
    }

    private static List<String> ruleIds(String violatedRules) {
        String value = violatedRules.strip();
        if (value.equalsIgnoreCase(NONE)) {
            return List.of();
        }
        return Arrays.stream(RULE_SEPARATOR.split(value)).map(QualityLineage::unquoted).filter(id -> !id.isEmpty())
                .toList();
    }

    /** A labeled line's value: {@code Label: value}, optionally a list item and bold, its quotes and bold dropped. */
    private static String value(String label, String description) {
        if (description == null) {
            return null;
        }
        Matcher line = Pattern.compile("(?mi)^\\s*(?:[-*]\\s+)?\\**" + label + "\\**:\\**[ \\t]*(\\S.*)$")
                .matcher(description);
        if (!line.find()) {
            return null;
        }
        String value = unquoted(line.group(1));
        return value.isEmpty() ? null : value;
    }

    private static String firstWord(String value) {
        return value == null ? "" : unquoted(value.strip().split("[\\s,;(]+", 2)[0]);
    }

    private static String unquoted(String value) {
        return value.strip().replaceAll("^[`*_\"']+|[`*_\"'.]+$", "");
    }
}
