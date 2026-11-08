package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * The mods a work profile mounts on a card's cells (card://JAVA-1569): which Fluxor mods, by their kebab-case id,
 * every role that works the cell follows besides the ones its own sheet requires. Rows are the role matrix's row
 * keys (a category, or the spike's ux-ui subtype) and the {@link Signal} wire values, so a signal mounts its mods
 * on any card that carries it. A mod here is only an id, like a role: whether it exists is Fluxor's to say.
 */
public record ModMatrix(Map<String, Map<Phase, List<String>>> cells) {

    static final Pattern MOD_ID = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");
    private static final int MAX_MOD_ID = 64;
    static final int MAX_MODS_PER_CELL = 20;

    public ModMatrix {
        Map<String, Map<Phase, List<String>>> copy = new LinkedHashMap<>();
        if (cells != null) {
            cells.forEach((row, byPhase) -> {
                Map<Phase, List<String>> phases = new EnumMap<>(Phase.class);
                byPhase.forEach((phase, ids) -> phases.put(phase, List.copyOf(ids)));
                copy.put(row, Collections.unmodifiableMap(phases));
            });
        }
        cells = Collections.unmodifiableMap(copy);
    }

    public static ModMatrix empty() {
        return new ModMatrix(Map.of());
    }

    /** The mods of one row in one phase; empty for a cell nobody set. */
    public List<String> cell(String row, Phase phase) {
        Map<Phase, List<String>> byPhase = cells.get(row);
        return byPhase == null ? List.of() : byPhase.getOrDefault(phase, List.of());
    }

    /** This matrix with every cell {@code override} names replacing its own; an empty cell clears it. */
    public ModMatrix overlay(ModMatrix override) {
        Map<String, Map<Phase, List<String>>> rows = new LinkedHashMap<>();
        cells.forEach((row, byPhase) -> rows.put(row, new EnumMap<>(byPhase)));
        override.cells.forEach((row, byPhase) -> rows.computeIfAbsent(row, r -> new EnumMap<>(Phase.class))
                .putAll(byPhase));
        return new ModMatrix(rows);
    }

    /** Wire shape: {@code {bug: {review: ["rule-enforcer"], ...}, touches-ui: {...}}}, rows in the matrix's order. */
    public Map<String, Object> toWire() {
        Map<String, Object> rows = new LinkedHashMap<>();
        for (String row : rowNames()) {
            Map<Phase, List<String>> byPhase = cells.get(row);
            if (byPhase != null) {
                Map<String, List<String>> wire = new LinkedHashMap<>();
                byPhase.forEach((phase, ids) -> wire.put(phase.wire(), ids));
                rows.put(row, wire);
            }
        }
        return rows;
    }

    /** A caller's override, validated like the roles: known rows, phase wire values, kebab-case ids, at most 20. */
    public static ModMatrix fromWire(Map<String, Map<String, List<String>>> rows) {
        if (rows == null) {
            return empty();
        }
        List<String> known = rowNames();
        Map<String, Map<Phase, List<String>>> cells = new LinkedHashMap<>();
        rows.forEach((row, byPhase) -> {
            if (!known.contains(row)) {
                throw invalid("Unknown mods row: " + row + ". One of: " + String.join(", ", known));
            }
            Map<Phase, List<String>> parsed = new EnumMap<>(Phase.class);
            if (byPhase != null) {
                byPhase.forEach((phase, ids) -> parsed.put(Phase.fromWire(phase), ids(ids)));
            }
            cells.put(row, parsed);
        });
        return new ModMatrix(cells);
    }

    /** Every row a mod may be mounted on: the role matrix's rows, then the signals. */
    static List<String> rowNames() {
        List<String> names = new ArrayList<>(RoleMatrix.rowKeys());
        Arrays.stream(Signal.values()).map(Signal::wire).forEach(names::add);
        return names;
    }

    private static List<String> ids(List<String> raw) {
        List<String> ids = raw == null ? List.of() : List.copyOf(new LinkedHashSet<>(raw));
        if (ids.size() > MAX_MODS_PER_CELL) {
            throw invalid("At most " + MAX_MODS_PER_CELL + " mods per cell");
        }
        ids.forEach(ModMatrix::requireModId);
        return ids;
    }

    /** Is {@code id} a mod id: kebab-case and at most 64 characters. */
    static boolean isModId(String id) {
        return id != null && id.length() <= MAX_MOD_ID && MOD_ID.matcher(id).matches();
    }

    static void requireModId(String id) {
        if (!isModId(id)) {
            throw invalid("A mod is a kebab-case id such as \"rule-enforcer\", not: " + id);
        }
    }

    private static OfficiumException invalid(String message) {
        return OfficiumException.badRequest("invalid_role_matrix", message);
    }
}
