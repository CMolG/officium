package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.ModRules;
import com.javadaba.contexts.officium.domain.ToolTier;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Roles and mods as Fluxor's catalog holds them (ADR 0018, cards JAVA-1524 and JAVA-1569): Officium names which role
 * and mod ids work a card, Fluxor's catalog says what each one is. Read in process, the newest version of each. Both
 * are directives of the catalog; a role is the one in the {@code role} exclusive group, a mod is any other.
 */
public interface RoleCatalog {

    /**
     * A role as the catalog holds it: its sheet in Markdown ({@code body}). {@code tags} carry {@code board} for the
     * roles that work cards (roles.list shows them; a role without it is reached by its id only).
     */
    record RoleContent(String roleId, int version, String title, String description, String body, List<String> tags) {
    }

    /**
     * A mod as the catalog holds it: {@code incompatibleWith} are the mods it excludes, {@code requiredBy} the roles
     * whose sheet requires it.
     */
    record ModContent(String modId, int version, String title, String description, String body, List<String> tags,
            List<String> domains, List<String> incompatibleWith, List<String> requiredBy) {
    }

    /**
     * A role as one Officium project reads it (JAVA-404): {@code source} is {@code harness} when the project's
     * harness pins that exact version, else {@code catalog}.
     */
    record Resolved(RoleContent role, String source) {
    }

    /** The role, or empty for an id the catalog lacks or one that names a mod. */
    Optional<RoleContent> find(String roleId);

    /** Every role of the catalog, newest version, sorted by id, bodies included (the caller drops what it does not serve). */
    List<RoleContent> roles();

    /**
     * The role an Officium project works with (JAVA-404): the version its linked harness project pins, else the
     * newest; {@code version} exactly when given. Empty for an id the catalog lacks, a mod, or a version it lacks.
     */
    Optional<Resolved> resolve(UUID officiumProjectId, String roleId, Integer version);

    /** Every mod of the catalog, by id. */
    List<ModContent> mods();

    /** The mod, or empty for an id the catalog lacks or one that names a role. */
    Optional<ModContent> findMod(String modId);

    /** The mods each role requires and the pairs that exclude each other: what a card's mods resolve against. */
    ModRules rules();

    /**
     * The tool tier each role declares (JAVA-1445), by role id. A role the catalog holds without one, an older seed,
     * is absent: it is served without a tier, as before the tiers existed.
     */
    Map<String, ToolTier> toolTiers();
}
