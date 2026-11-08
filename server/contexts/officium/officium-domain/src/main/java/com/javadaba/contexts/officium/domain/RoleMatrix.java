package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Which roles may work a card (user request, 2026-09-29, JAVA-294): its category's roles for the
 * {@link Phase} its status is in, plus the roles each of its {@link Signal}s adds in that phase.
 *
 * <p>The matrix is Officium's; the roles are Fluxor's (user decision, 2026-09-29). So a role here is
 * only an id -- the English kebab id of a Fluxor market atom (JAVA-327) -- and whether it exists is
 * Fluxor's to say (JAVA-374), not checked here. {@link #defaults()} is the user's matrix: one row per
 * category from JAVA-328 to JAVA-342, and the signal rows from JAVA-294's comment of 11:31. A
 * project overrides cells of it ({@link #overlay}), which is JAVA-243's per-project setting.
 *
 * <p>Rows are keyed by the category's wire value, plus {@link #SPIKE_UX_UI} for the spike's second
 * subtype. A missing cell is an empty one. {@code runs} is the model and effort each category cell is
 * worked with (JAVA-915); a role added by a signal is worked with its card's category cell.
 * {@code implementer} is the one role every action cell names in a project that executes by epic
 * ({@link ImplementerMatrix}, card://JAVA-1875); null everywhere else.
 */
public record RoleMatrix(Map<String, Map<Phase, List<String>>> categories,
        Map<Signal, Map<Phase, List<String>>> signals, RunMatrix runs, ModMatrix mods, String implementer) {

    /** The ux-ui subtype of a spike (JAVA-339). The plain {@code spike} row is the technical one. */
    public static final String SPIKE_UX_UI = "spike/ux-ui";

    static final Pattern ROLE_ID = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");
    private static final int MAX_ROLE_ID = 64;
    private static final int MAX_ROLES_PER_CELL = 20;

    private static final RoleMatrix DEFAULTS = RoleMatrixDefaults.build();

    public RoleMatrix {
        categories = copyRows(categories);
        signals = signals == null ? Map.of() : copySignalRows(signals);
        runs = runs == null ? RunMatrix.empty() : runs;
        mods = mods == null ? ModMatrix.empty() : mods;
    }

    /** A matrix of a project that executes card by card: no implementer replaces its action roles. */
    public RoleMatrix(Map<String, Map<Phase, List<String>>> categories,
            Map<Signal, Map<Phase, List<String>>> signals, RunMatrix runs, ModMatrix mods) {
        this(categories, signals, runs, mods, null);
    }

    /** A matrix of roles and run cells, with no mods (card://JAVA-1569 added them). */
    public RoleMatrix(Map<String, Map<Phase, List<String>>> categories,
            Map<Signal, Map<Phase, List<String>>> signals, RunMatrix runs) {
        this(categories, signals, runs, ModMatrix.empty());
    }

    /** A matrix of roles only, with no model or effort of its own. */
    public RoleMatrix(Map<String, Map<Phase, List<String>>> categories,
            Map<Signal, Map<Phase, List<String>>> signals) {
        this(categories, signals, RunMatrix.empty(), ModMatrix.empty());
    }

    public static RoleMatrix defaults() {
        return DEFAULTS;
    }

    public static RoleMatrix empty() {
        return new RoleMatrix(Map.of(), Map.of());
    }

    /** Every row key an override may name: the fifteen categories and the spike's ux-ui subtype. */
    public static List<String> rowKeys() {
        List<String> keys = new ArrayList<>();
        for (Category category : Category.values()) {
            keys.add(category.wire());
        }
        keys.add(SPIKE_UX_UI);
        return keys;
    }

    /**
     * The roles eligible for a card with this category (and spike subtype), in this status, carrying
     * these signals: the category's cell first, then each signal's, each role once. No category
     * gives only the signals' roles; a status with no phase (Done) gives none.
     */
    public List<String> eligible(Category category, SpikeSubtype subtype, Status status,
            Collection<Signal> cardSignals) {
        Phase phase = Phase.of(status).orElse(null);
        if (phase == null) {
            return List.of();
        }
        List<Signal> present = Signal.normalized(cardSignals);
        Set<String> roles = new LinkedHashSet<>();
        if (category != null) {
            roles.addAll(cell(categories.get(rowFor(category, subtype)), phase));
        }
        for (Signal signal : present) {
            roles.addAll(cell(signals.get(signal), phase));
        }
        return List.copyOf(roles);
    }

    /** The model and effort of the card's category cell in this status; empty with no category or phase. */
    public Optional<RunConfig> runConfig(Category category, SpikeSubtype subtype, Status status) {
        Phase phase = Phase.of(status).orElse(null);
        if (phase == null || category == null) {
            return Optional.empty();
        }
        return runs.resolve(rowFor(category, subtype), phase, null);
    }

    /** Each eligible role's model and effort: its override in the category cell, else the cell's. */
    public Map<String, RunConfig> runConfigs(Category category, SpikeSubtype subtype, Status status,
            Collection<Signal> cardSignals) {
        Phase phase = Phase.of(status).orElse(null);
        Map<String, RunConfig> byRole = new LinkedHashMap<>();
        if (phase == null || category == null) {
            return byRole;
        }
        String row = rowFor(category, subtype);
        for (String role : eligible(category, subtype, status, cardSignals)) {
            runs.resolve(row, phase, role).ifPresent(run -> byRole.put(role, run));
        }
        return byRole;
    }

    /**
     * The mods the matrix mounts on a card in this status (card://JAVA-1569): its category row's cell, then its
     * signals', each once. Empty with no phase. They are the cell's, so every eligible role follows them.
     */
    public List<String> cellMods(Category category, SpikeSubtype subtype, Status status,
            Collection<Signal> cardSignals) {
        Phase phase = Phase.of(status).orElse(null);
        if (phase == null) {
            return List.of();
        }
        Set<String> ids = new LinkedHashSet<>();
        if (category != null) {
            ids.addAll(mods.cell(rowFor(category, subtype), phase));
        }
        for (Signal signal : Signal.normalized(cardSignals)) {
            ids.addAll(mods.cell(signal.wire(), phase));
        }
        return List.copyOf(ids);
    }

    /**
     * Each eligible role's mods: its required mods (the floor), then the cell's and the signals' (card://JAVA-1569),
     * minus any that excludes one already kept; {@code dropped} hears of each one left out.
     */
    public Map<String, List<String>> modsByRole(Category category, SpikeSubtype subtype, Status status,
            Collection<Signal> cardSignals, ModRules rules, java.util.function.Consumer<String> dropped) {
        Map<String, List<String>> byRole = new LinkedHashMap<>();
        List<String> cell = cellMods(category, subtype, status, cardSignals);
        for (String role : eligible(category, subtype, status, cardSignals)) {
            List<String> resolved = rules.resolve(role, ImplementerMatrix.withImplementerMods(this, role, cell,
                    category, subtype, status, cardSignals), dropped);
            if (!resolved.isEmpty()) {
                byRole.put(role, resolved);
            }
        }
        return byRole;
    }

    /** A ux-ui spike reads its own row; the touches-ui signal adds its roles but never picks the row. */
    static String rowFor(Category category, SpikeSubtype subtype) {
        return category == Category.SPIKE && subtype == SpikeSubtype.UX_UI ? SPIKE_UX_UI : category.wire();
    }

    private static List<String> cell(Map<Phase, List<String>> row, Phase phase) {
        return row == null ? List.of() : row.getOrDefault(phase, List.of());
    }

    /** This matrix with every cell {@code override} names replacing its own; an empty cell clears it. */
    public RoleMatrix overlay(RoleMatrix override) {
        Map<String, Map<Phase, List<String>>> rows = new LinkedHashMap<>();
        categories.forEach((key, row) -> rows.put(key, new EnumMap<>(row)));
        override.categories.forEach((key, row) -> rows.computeIfAbsent(key, k -> new EnumMap<>(Phase.class))
                .putAll(row));
        Map<Signal, Map<Phase, List<String>>> signalRows = new EnumMap<>(Signal.class);
        signals.forEach((signal, row) -> signalRows.put(signal, new EnumMap<>(row)));
        override.signals.forEach((signal, row) -> signalRows.computeIfAbsent(signal, s -> new EnumMap<>(Phase.class))
                .putAll(row));
        return new RoleMatrix(rows, signalRows, runs.overlay(override.runs), mods.overlay(override.mods),
                implementer);
    }

    /** This override with {@code runs} in place of its own: what a write that names no runs keeps. */
    public RoleMatrix withRuns(RunMatrix replacement) {
        return new RoleMatrix(categories, signals, replacement, mods, implementer);
    }

    /** This override with {@code replacement} mods in place of its own: what a write that names no mods keeps. */
    public RoleMatrix withMods(ModMatrix replacement) {
        return new RoleMatrix(categories, signals, runs, replacement, implementer);
    }

    /**
     * This override without the parts its holder may not use (JAVA-1007): the roles (categories, signals and
     * mods) when {@code roles} is false, the run cells when {@code runs} is false. The stored copy is not
     * touched, so a re-subscription reads these again.
     */
    public RoleMatrix keeping(boolean roles, boolean runs) {
        return new RoleMatrix(roles ? categories : Map.of(), roles ? signals : Map.of(),
                runs ? this.runs : RunMatrix.empty(), roles ? mods : ModMatrix.empty(), implementer);
    }

    /**
     * Wire shape: {@code {categories: {bug: {refine: [...], ...}}, signals: {touches-ui: {...}},
     * runs: {bug: {refine: {model, effort, roles?}}}, mods: {bug: {review: [modId]}, touches-ui: {...}}}}.
     */
    public Map<String, Object> toWire() {
        Map<String, Object> rows = new LinkedHashMap<>();
        for (String key : rowKeys()) {
            Map<Phase, List<String>> row = categories.get(key);
            if (row != null) {
                rows.put(key, rowToWire(row));
            }
        }
        Map<String, Object> signalRows = new LinkedHashMap<>();
        signals.forEach((signal, row) -> signalRows.put(signal.wire(), rowToWire(row)));
        Map<String, Object> wire = new LinkedHashMap<>();
        wire.put("categories", rows);
        wire.put("signals", signalRows);
        wire.put("runs", runs.toWire());
        wire.put("mods", mods.toWire());
        if (implementer != null) {
            wire.put("implementer", implementer);
            wire.put("implementerMods", ImplementerMatrix.DEFAULT_MODS.toWire());
        }
        return wire;
    }

    private static Map<String, List<String>> rowToWire(Map<Phase, List<String>> row) {
        Map<String, List<String>> wire = new LinkedHashMap<>();
        row.forEach((phase, roles) -> wire.put(phase.wire(), roles));
        return wire;
    }

    /**
     * A caller's override, validated: rows are {@link #rowKeys()} or signal wire values, cells are
     * phase wire values, roles are kebab-case ids. Anything else is {@code 400 invalid_role_matrix}.
     */
    public static RoleMatrix fromWire(Map<String, Map<String, List<String>>> categoryRows,
            Map<String, Map<String, List<String>>> signalRows) {
        return fromWire(categoryRows, signalRows, null);
    }

    /** The same, with the run cells ({@link RunMatrix#fromWire}). */
    public static RoleMatrix fromWire(Map<String, Map<String, List<String>>> categoryRows,
            Map<String, Map<String, List<String>>> signalRows, Map<String, ? extends Map<String, ?>> runRows) {
        return fromWire(categoryRows, signalRows, runRows, null);
    }

    /** The same, with the mods ({@link ModMatrix#fromWire}): {@code {row: {phase: [modId]}}}. */
    public static RoleMatrix fromWire(Map<String, Map<String, List<String>>> categoryRows,
            Map<String, Map<String, List<String>>> signalRows, Map<String, ? extends Map<String, ?>> runRows,
            Map<String, Map<String, List<String>>> modRows) {
        List<String> known = rowKeys();
        Map<String, Map<Phase, List<String>>> rows = new LinkedHashMap<>();
        if (categoryRows != null) {
            categoryRows.forEach((key, row) -> {
                if (!known.contains(key)) {
                    throw invalid("Unknown category row: " + key + ". One of: " + String.join(", ", known));
                }
                rows.put(key, rowFromWire(row));
            });
        }
        Map<Signal, Map<Phase, List<String>>> bySignal = new EnumMap<>(Signal.class);
        if (signalRows != null) {
            signalRows.forEach((key, row) -> bySignal.put(Signal.fromWire(key), rowFromWire(row)));
        }
        return new RoleMatrix(rows, bySignal, RunMatrix.fromWire(runRows), ModMatrix.fromWire(modRows));
    }

    private static Map<Phase, List<String>> rowFromWire(Map<String, List<String>> row) {
        Map<Phase, List<String>> cells = new EnumMap<>(Phase.class);
        if (row == null) {
            return cells;
        }
        row.forEach((phase, roles) -> {
            List<String> ids = roles == null ? List.of() : List.copyOf(new LinkedHashSet<>(roles));
            if (ids.size() > MAX_ROLES_PER_CELL) {
                throw invalid("At most " + MAX_ROLES_PER_CELL + " roles per cell");
            }
            ids.forEach(RoleMatrix::requireRoleId);
            cells.put(Phase.fromWire(phase), ids);
        });
        return cells;
    }

    /** Is {@code id} a role id: kebab-case and at most 64 characters. */
    static boolean isRoleId(String id) {
        return id != null && id.length() <= MAX_ROLE_ID && ROLE_ID.matcher(id).matches();
    }

    static void requireRoleId(String id) {
        if (!isRoleId(id)) {
            throw invalid("A role is a kebab-case id such as \"code-reviewer\", not: " + id);
        }
    }

    private static OfficiumException invalid(String message) {
        return OfficiumException.badRequest("invalid_role_matrix", message);
    }

    private static Map<String, Map<Phase, List<String>>> copyRows(Map<String, Map<Phase, List<String>>> rows) {
        Map<String, Map<Phase, List<String>>> copy = new LinkedHashMap<>();
        if (rows != null) {
            rows.forEach((key, row) -> copy.put(key, copyRow(row)));
        }
        return java.util.Collections.unmodifiableMap(copy);
    }

    private static Map<Signal, Map<Phase, List<String>>> copySignalRows(Map<Signal, Map<Phase, List<String>>> rows) {
        Map<Signal, Map<Phase, List<String>>> copy = new EnumMap<>(Signal.class);
        rows.forEach((signal, row) -> copy.put(signal, copyRow(row)));
        return java.util.Collections.unmodifiableMap(copy);
    }

    private static Map<Phase, List<String>> copyRow(Map<Phase, List<String>> row) {
        Map<Phase, List<String>> copy = new EnumMap<>(Phase.class);
        if (row != null) {
            row.forEach((phase, roles) -> copy.put(phase, List.copyOf(roles)));
        }
        return java.util.Collections.unmodifiableMap(copy);
    }
}
