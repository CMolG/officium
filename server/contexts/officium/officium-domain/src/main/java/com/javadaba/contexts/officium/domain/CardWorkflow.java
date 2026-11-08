package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * A card's own workflow (card://JAVA-1591): the role and the mods it wants in each phase it visits, stored on the
 * card as the author wrote it. A phase the workflow leaves out keeps the matrix's answer ({@link CardRoles}).
 *
 * <p>The document is {@code {"version": 1, "phases": {"refine": {"role": "<id>", "mods": ["<id>"]}, ...}}}. Writing one
 * validates it against the card itself: each role must be eligible for the card's category, subtype and signals in
 * that phase, and each mod must survive {@link ModRules#resolve}. Every problem is reported at once, by phase.
 *
 * <p>An epic's workflow is written once for the whole epic (card://JAVA-1885): its {@code phases} work the epic, and
 * its {@code cards} part, keyed by matrix row ({@code "feature"}, {@code "spike/ux-ui"}), works each of its cards
 * ({@link GoverningWorkflow}). A part is checked against its row with no signals, so a pick fits every card of the
 * row; a phase it leaves out keeps the matrix's answer, signals included.
 */
public record CardWorkflow(Map<Phase, Pick> phases, Map<String, Map<Phase, Pick>> cards) {

    public static final int VERSION = 1;
    static final int MAX_MODS = 20;
    static final String CARDS = "cards";

    /** The role that works one phase, and the mods it works with on top of the role's required ones. */
    public record Pick(String role, List<String> mods) {

        public Pick {
            mods = mods == null ? List.of() : List.copyOf(mods);
        }
    }

    /** One thing wrong with a workflow, named by the phase it is in (the wire name, as written). */
    public record Problem(String phase, String message) {

        String text() {
            return phase + ": " + message;
        }
    }

    public CardWorkflow {
        phases = copy(phases);
        Map<String, Map<Phase, Pick>> rows = new LinkedHashMap<>();
        for (String row : cards == null ? List.<String>of() : RoleMatrix.rowKeys()) {
            if (cards.containsKey(row)) {
                rows.put(row, copy(cards.get(row)));
            }
        }
        cards = Collections.unmodifiableMap(rows);
    }

    /** A workflow of phases only: a card's own, or an epic's with no part for its cards yet. */
    public CardWorkflow(Map<Phase, Pick> phases) {
        this(phases, Map.of());
    }

    public Optional<Pick> pick(Phase phase) {
        return Optional.ofNullable(phases.get(phase));
    }

    /** The part of an epic's workflow that works its cards of {@code row}, as a workflow of their own. */
    public Optional<CardWorkflow> part(String row) {
        return Optional.ofNullable(cards.get(row)).map(CardWorkflow::new);
    }

    /**
     * Reads and validates a workflow written for this card: a problem with its shape, with a role that is not eligible
     * for the card in that phase, or with a mod that the role's rules drop, answers {@code workflow_invalid} listing
     * every one of them.
     */
    public static CardWorkflow validate(Object wire, RoleMatrix matrix, ModRules rules, Category category,
            SpikeSubtype subtype, Collection<Signal> signals) {
        List<Problem> problems = new ArrayList<>();
        CardWorkflow workflow = parse(wire, problems);
        problems.addAll(workflow.problemsFor(matrix, rules, category, subtype, signals));
        if (!problems.isEmpty()) {
            throw OfficiumException.badRequest("workflow_invalid", "The workflow is invalid. "
                    + problems.stream().map(Problem::text).collect(Collectors.joining("; ")));
        }
        return workflow;
    }

    /**
     * What is wrong with this workflow against the card as it is NOW: a pick whose role is no longer eligible for the
     * card's category, subtype and signals, or a mod that the role's rules drop; on an epic, the same for each pick of
     * its cards part against that part's row. Empty when it still fits. The shape is not re-read here: {@link #validate}
     * checks it when the workflow is written.
     */
    public List<Problem> problemsFor(RoleMatrix matrix, ModRules rules, Category category, SpikeSubtype subtype,
            Collection<Signal> signals) {
        List<Problem> problems = new ArrayList<>();
        phases.forEach((phase, pick) -> eligibility("", "this card", phase, pick, matrix, rules, category, subtype,
                signals, problems));
        if (!cards.isEmpty() && category != Category.EPIC) {
            problems.add(new Problem(CARDS, "only an epic's workflow has a part for its cards"));
        } else {
            cards.forEach((row, part) -> part.forEach((phase, pick) -> eligibility(CARDS + "." + row + ".",
                    "a " + row + " card", phase, pick, matrix, rules, categoryOf(row), subtypeOf(row), List.of(),
                    problems)));
        }
        return List.copyOf(problems);
    }

    /** The workflow a card stores, or null when what is stored cannot be read: the shape alone is checked. */
    public static CardWorkflow readStored(Object wire) {
        List<Problem> problems = new ArrayList<>();
        CardWorkflow workflow = parse(wire, problems);
        return problems.isEmpty() && wire != null ? workflow : null;
    }

    /** The wire document, as a card's view and its storage carry it; {@code cards} only when it has a part. */
    public Map<String, Object> wire() {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("version", VERSION);
        document.put("phases", wire(phases));
        if (!cards.isEmpty()) {
            Map<String, Object> rows = new LinkedHashMap<>();
            cards.forEach((row, part) -> rows.put(row, wire(part)));
            document.put(CARDS, rows);
        }
        return document;
    }

    /** The JSON Schema of the document (draft 2020-12), built from the same phases and id patterns as the check. */
    public static Map<String, Object> schema() {
        Map<String, Object> role = Map.of("type", "string", "pattern", RoleMatrix.ROLE_ID.pattern(), "maxLength", 64);
        Map<String, Object> mods = Map.of("type", "array", "maxItems", MAX_MODS,
                "items", Map.of("type", "string", "pattern", ModMatrix.MOD_ID.pattern()));
        Map<String, Object> pick = Map.of("type", "object", "required", List.of("role"),
                "additionalProperties", false, "properties", Map.of("role", role, "mods", mods));
        Map<String, Object> byPhase = new LinkedHashMap<>();
        for (Phase phase : Phase.values()) {
            byPhase.put(phase.wire(), pick);
        }
        Map<String, Object> phases = Map.of("type", "object", "additionalProperties", false, "properties", byPhase);
        Map<String, Object> byRow = new LinkedHashMap<>();
        partRows().forEach(row -> byRow.put(row, phases));
        return Map.of("$schema", "https://json-schema.org/draft/2020-12/schema", "type", "object",
                "required", List.of("version", "phases"), "additionalProperties", false,
                "properties", Map.of("version", Map.of("const", VERSION), "phases", phases,
                        CARDS, Map.of("type", "object", "additionalProperties", false, "properties", byRow)));
    }

    /** The rows an epic's cards part may name: every row of the matrix but the epic's own. */
    static List<String> partRows() {
        return RoleMatrix.rowKeys().stream().filter(row -> !Category.EPIC.wire().equals(row)).toList();
    }

    private static Map<Phase, Pick> copy(Map<Phase, Pick> picks) {
        Map<Phase, Pick> copy = new EnumMap<>(Phase.class);
        if (picks != null) {
            copy.putAll(picks);
        }
        return Collections.unmodifiableMap(copy);
    }

    private static Map<String, Object> wire(Map<Phase, Pick> picks) {
        Map<String, Object> byPhase = new LinkedHashMap<>();
        picks.forEach((phase, pick) -> byPhase.put(phase.wire(), Map.of("role", pick.role(), "mods", pick.mods())));
        return byPhase;
    }

    private static CardWorkflow parse(Object wire, List<Problem> problems) {
        if (!(wire instanceof Map<?, ?> document)) {
            problems.add(new Problem("document", "a workflow is an object with version and phases"));
            return new CardWorkflow(Map.of());
        }
        if (!(document.get("version") instanceof Number version && version.intValue() == VERSION)) {
            problems.add(new Problem("document", "version must be " + VERSION));
        }
        if (!(document.get("phases") instanceof Map<?, ?> phases)) {
            problems.add(new Problem("document", "phases must be an object keyed by phase"));
            return new CardWorkflow(Map.of());
        }
        return new CardWorkflow(picks("", phases, problems), parts(document.get(CARDS), problems));
    }

    private static Map<String, Map<Phase, Pick>> parts(Object wire, List<Problem> problems) {
        Map<String, Map<Phase, Pick>> parts = new LinkedHashMap<>();
        if (wire == null) {
            return parts;
        }
        if (!(wire instanceof Map<?, ?> rows)) {
            problems.add(new Problem(CARDS, "cards must be an object keyed by category"));
            return parts;
        }
        List<String> known = partRows();
        rows.forEach((key, value) -> {
            String row = String.valueOf(key);
            if (!known.contains(row)) {
                problems.add(new Problem(CARDS + "." + row, "unknown row; one of: " + String.join(", ", known)));
            } else if (value instanceof Map<?, ?> phases) {
                parts.put(row, picks(CARDS + "." + row + ".", phases, problems));
            } else {
                problems.add(new Problem(CARDS + "." + row, "a row is an object keyed by phase"));
            }
        });
        return parts;
    }

    private static Map<Phase, Pick> picks(String prefix, Map<?, ?> phases, List<Problem> problems) {
        Map<Phase, Pick> picks = new EnumMap<>(Phase.class);
        phases.forEach((key, value) -> parsePhase(prefix, String.valueOf(key), value, picks, problems));
        return picks;
    }

    private static void parsePhase(String prefix, String name, Object value, Map<Phase, Pick> picks,
            List<Problem> problems) {
        Optional<Phase> phase = Arrays.stream(Phase.values()).filter(p -> p.wire().equals(name)).findFirst();
        if (phase.isEmpty()) {
            problems.add(new Problem(prefix + name, "unknown phase; one of: " + Arrays.stream(Phase.values())
                    .map(Phase::wire).collect(Collectors.joining(", "))));
            return;
        }
        if (!(value instanceof Map<?, ?> pick) || !(pick.get("role") instanceof String role)) {
            problems.add(new Problem(prefix + name, "a phase names its role"));
            return;
        }
        List<String> mods = pick.get("mods") instanceof List<?> list
                ? list.stream().map(String::valueOf).toList()
                : List.of();
        if (!RoleMatrix.isRoleId(role)) {
            problems.add(new Problem(prefix + name, "a role is a kebab-case id such as \"code-reviewer\", not: "
                    + role));
        }
        if (mods.size() > MAX_MODS || mods.stream().anyMatch(mod -> !ModMatrix.isModId(mod))) {
            problems.add(new Problem(prefix + name, "mods are at most " + MAX_MODS + " kebab-case ids"));
        }
        picks.put(phase.get(), new Pick(role, mods));
    }

    private static void eligibility(String prefix, String subject, Phase phase, Pick written, RoleMatrix matrix,
            ModRules rules, Category category, SpikeSubtype subtype, Collection<Signal> signals,
            List<Problem> problems) {
        String name = prefix + phase.wire();
        List<String> eligible = matrix.eligible(category, subtype, phase.status(), signals);
        if (!RoleMatrix.isRoleId(written.role())) {
            return;
        }
        Pick pick = CardRoles.asImplementer(written, phase, matrix, eligible);
        if (!eligible.contains(pick.role())) {
            problems.add(new Problem(name, pick.role() + " is not eligible in " + phase.wire() + " for " + subject
                    + "; eligible: "
                    + (eligible.isEmpty() ? "none (set the card's category first)" : String.join(", ", eligible))));
            return;
        }
        rules.resolve(pick.role(), pick.mods(), dropped -> problems.add(new Problem(name, dropped)));
    }

    private static Category categoryOf(String row) {
        return RoleMatrix.SPIKE_UX_UI.equals(row) ? Category.SPIKE : Category.fromWire(row);
    }

    private static SpikeSubtype subtypeOf(String row) {
        return RoleMatrix.SPIKE_UX_UI.equals(row) ? SpikeSubtype.UX_UI : null;
    }
}
