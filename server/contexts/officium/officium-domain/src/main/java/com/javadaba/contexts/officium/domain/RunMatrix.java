package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The model and effort of every (category, phase) cell of a {@link RoleMatrix} (user request, 2026-10-05,
 * JAVA-915): planning and review reason on Opus, implementation runs on Sonnet. Rows are the role matrix's row
 * keys; a project overrides cells of the defaults ({@link #overlay}), and an overridden cell replaces the
 * default's whole, roles included, the same way a role cell does.
 */
public record RunMatrix(Map<String, Map<Phase, RunCell>> cells) {

    /**
     * The row of the cell a card's own workflow runs its refine phase on (card://JAVA-1591). It is not a category
     * row: no category or work profile loops over it, so it is set on its own, and it only has a refine cell.
     */
    public static final String WORKFLOW = "workflow";

    public RunMatrix {
        Map<String, Map<Phase, RunCell>> copy = new LinkedHashMap<>();
        if (cells != null) {
            cells.forEach((row, byPhase) -> copy.put(row, Collections.unmodifiableMap(new EnumMap<>(byPhase))));
        }
        cells = Collections.unmodifiableMap(copy);
    }

    public static RunMatrix empty() {
        return new RunMatrix(Map.of());
    }

    /** The config a role works this row's cell with, in this phase; empty for a row or cell nobody set. */
    public Optional<RunConfig> resolve(String row, Phase phase, String role) {
        Map<Phase, RunCell> byPhase = cells.get(row);
        RunCell cell = byPhase == null ? null : byPhase.get(phase);
        if (cell == null) {
            return Optional.empty();
        }
        return Optional.of(role == null ? cell.config() : cell.forRole(role));
    }

    public RunMatrix overlay(RunMatrix override) {
        Map<String, Map<Phase, RunCell>> rows = new LinkedHashMap<>();
        cells.forEach((row, byPhase) -> rows.put(row, new EnumMap<>(byPhase)));
        override.cells.forEach((row, byPhase) -> rows.computeIfAbsent(row, r -> new EnumMap<>(Phase.class))
                .putAll(byPhase));
        return new RunMatrix(rows);
    }

    /** Wire shape: {@code {bug: {refine: {model, effort, roles?}, ...}, ...}}, rows in the matrix's order. */
    public Map<String, Object> toWire() {
        Map<String, Object> rows = new LinkedHashMap<>();
        for (String row : RoleMatrix.rowKeys()) {
            Map<Phase, RunCell> byPhase = cells.get(row);
            if (byPhase != null) {
                Map<String, Object> wire = new LinkedHashMap<>();
                byPhase.forEach((phase, cell) -> wire.put(phase.wire(), cell.toWire()));
                rows.put(row, wire);
            }
        }
        Map<Phase, RunCell> workflow = cells.get(WORKFLOW);
        if (workflow != null) {
            Map<String, Object> wire = new LinkedHashMap<>();
            workflow.forEach((phase, cell) -> wire.put(phase.wire(), cell.toWire()));
            rows.put(WORKFLOW, wire);
        }
        return rows;
    }

    /** A caller's override, validated like the roles: known rows, phase wire values, well-formed cells. */
    public static RunMatrix fromWire(Map<String, ? extends Map<String, ?>> rows) {
        if (rows == null) {
            return empty();
        }
        List<String> known = new ArrayList<>(RoleMatrix.rowKeys());
        known.add(WORKFLOW);
        Map<String, Map<Phase, RunCell>> cells = new LinkedHashMap<>();
        rows.forEach((row, byPhase) -> {
            if (!known.contains(row)) {
                throw OfficiumException.badRequest("invalid_role_matrix",
                        "Unknown category row: " + row + ". One of: " + String.join(", ", known));
            }
            Map<Phase, RunCell> parsed = new EnumMap<>(Phase.class);
            if (byPhase != null) {
                byPhase.forEach((phase, cell) -> parsed.put(Phase.fromWire(phase), RunCell.fromWire(cell)));
            }
            if (WORKFLOW.equals(row) && parsed.keySet().stream().anyMatch(p -> p != Phase.REFINE)) {
                throw OfficiumException.badRequest("invalid_role_matrix",
                        "The workflow row only has a refine cell");
            }
            cells.put(row, parsed);
        });
        return new RunMatrix(cells);
    }
}
