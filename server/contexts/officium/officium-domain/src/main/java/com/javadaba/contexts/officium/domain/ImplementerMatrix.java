package com.javadaba.contexts.officium.domain;

import java.util.Collection;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The role matrix of a project that executes by epic (card://JAVA-1875, epic JAVA-1868): one implementer works every
 * action cell, so a sweep keeps one persona, one prompt prefix and one run from its first checkpoint to its last.
 * Planning and review keep their specialized roles. The two spike rows keep theirs too: a spike is research the plan
 * rests on, worked in its own session, not a checkpoint. The epic row's action cell, empty in card mode, names the
 * implementer, since the epic is what the sweep works.
 *
 * <p>What the retired action roles specialized in comes back as mods (card://JAVA-1877): {@link #DEFAULT_MODS} names
 * them by category and signal, and they ride on the implementer alone, before the project's own cell mods. They are
 * not cell mods: a researcher working a spike that touches the UI gets none of them.
 */
public final class ImplementerMatrix {

    /** The rows whose action roles stay: research, not implementation. */
    static final Set<String> RESEARCH_ROWS = Set.of(Category.SPIKE.wire(), RoleMatrix.SPIKE_UX_UI);

    /** The implementer's action mods by row (a category, or a signal's wire value): Fluxor mod ids. */
    public static final ModMatrix DEFAULT_MODS = ImplementerModDefaults.build();

    private ImplementerMatrix() {
    }

    /** {@code matrix} with {@code implementer} on every action cell but the research rows; signals add no action role. */
    public static RoleMatrix apply(RoleMatrix matrix, String implementer) {
        RoleMatrix.requireRoleId(implementer);
        Map<String, Map<Phase, List<String>>> rows = new LinkedHashMap<>();
        for (String key : RoleMatrix.rowKeys()) {
            Map<Phase, List<String>> row = new EnumMap<>(Phase.class);
            Map<Phase, List<String>> own = matrix.categories().get(key);
            if (own != null) {
                row.putAll(own);
            }
            if (!RESEARCH_ROWS.contains(key)) {
                row.put(Phase.ACTION, List.of(implementer));
            }
            rows.put(key, row);
        }
        Map<Signal, Map<Phase, List<String>>> signals = new EnumMap<>(Signal.class);
        matrix.signals().forEach((signal, own) -> {
            Map<Phase, List<String>> row = new EnumMap<>(own);
            row.remove(Phase.ACTION);
            signals.put(signal, row);
        });
        return new RoleMatrix(rows, signals, matrix.runs(), matrix.mods(), implementer);
    }

    /**
     * The mods {@code role} works a card with, given the cell's: the implementer's own by category and signal first, in
     * the action phase, then the cell's, each once. Any other role, or any other phase, gets the cell's as they are.
     */
    static List<String> withImplementerMods(RoleMatrix matrix, String role, List<String> cell, Category category,
            SpikeSubtype subtype, Status status, Collection<Signal> signals) {
        if (matrix.implementer() == null || !matrix.implementer().equals(role)
                || Phase.of(status).filter(phase -> phase == Phase.ACTION).isEmpty()) {
            return cell;
        }
        Set<String> ids = new LinkedHashSet<>();
        if (category != null) {
            ids.addAll(DEFAULT_MODS.cell(RoleMatrix.rowFor(category, subtype), Phase.ACTION));
        }
        Signal.normalized(signals).forEach(signal -> ids.addAll(DEFAULT_MODS.cell(signal.wire(), Phase.ACTION)));
        ids.addAll(cell);
        return List.copyOf(ids);
    }
}
