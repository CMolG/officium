package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;

/**
 * What Fluxor's catalog says about how mods stack (card://JAVA-1569): the mods each role requires (its floor, always
 * mounted) and the pairs of mods that exclude each other. A snapshot, so a card list resolves every card against one.
 */
public record ModRules(Map<String, List<String>> requiredByRole, Map<String, Set<String>> incompatible) {

    private static final ModRules NONE = new ModRules(Map.of(), Map.of());

    public ModRules {
        requiredByRole = Map.copyOf(requiredByRole);
        incompatible = Map.copyOf(incompatible);
    }

    /** No catalog knowledge: no floor and no exclusions. */
    public static ModRules none() {
        return NONE;
    }

    public List<String> required(String roleId) {
        return requiredByRole.getOrDefault(roleId, List.of());
    }

    public boolean exclude(String modId, String other) {
        return incompatible.getOrDefault(modId, Set.of()).contains(other)
                || incompatible.getOrDefault(other, Set.of()).contains(modId);
    }

    /**
     * The mods a role follows on a card: its required mods first (the floor, never dropped), then the cell's and the
     * signals' ({@code extra}), each once. An extra mod that excludes one already kept is left out, and
     * {@code dropped} hears about it.
     */
    public List<String> resolve(String roleId, List<String> extra, Consumer<String> dropped) {
        Set<String> kept = new LinkedHashSet<>(required(roleId));
        for (String mod : extra) {
            if (kept.contains(mod)) {
                continue;
            }
            String clash = kept.stream().filter(other -> exclude(mod, other)).findFirst().orElse(null);
            if (clash == null) {
                kept.add(mod);
            } else {
                dropped.accept("Mod " + mod + " dropped for role " + roleId + ": it excludes " + clash);
            }
        }
        return new ArrayList<>(kept);
    }
}
