package com.javadaba.apps.local.standins;

import com.javadaba.contexts.officium.domain.ModRules;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.contexts.officium.domain.ToolTier;
import com.javadaba.contexts.officium.domain.ports.RoleCatalog;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeSet;
import java.util.UUID;

/**
 * Roles are names an agent harness gives to a way of working. Officium Local keeps no role content:
 * it knows the ids the default role matrix uses, and accepts any other well-formed id a project
 * puts in its own matrix.
 */
@ApplicationScoped
public class LocalRoleCatalog implements RoleCatalog {

    private static RoleContent named(String id) {
        return new RoleContent(id, 1, id, "", "", List.of());
    }

    @Override
    public Optional<RoleContent> find(String roleId) {
        return roleId == null || roleId.isBlank() ? Optional.empty() : Optional.of(named(roleId.strip()));
    }

    @Override
    public List<RoleContent> roles() {
        var ids = new TreeSet<String>();
        RoleMatrix.defaults().categories().values()
                .forEach(row -> row.values().forEach(ids::addAll));
        return ids.stream().map(LocalRoleCatalog::named).toList();
    }

    @Override
    public Optional<Resolved> resolve(UUID officiumProjectId, String roleId, Integer version) {
        return find(roleId).map(role -> new Resolved(role, "local"));
    }

    @Override
    public List<ModContent> mods() {
        return List.of();
    }

    @Override
    public Optional<ModContent> findMod(String modId) {
        return Optional.empty();
    }

    @Override
    public ModRules rules() {
        return ModRules.none();
    }

    @Override
    public Map<String, ToolTier> toolTiers() {
        return Map.of();
    }
}
