package com.javadaba.contexts.officium.domain;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * One (category, phase) cell's model and effort (JAVA-915): {@code config} for every role of the cell, and
 * {@code roles} for a role that works it differently there (the user's choice: a role's override lives inside
 * the cell, so it can differ by category and phase).
 */
public record RunCell(RunConfig config, Map<String, RunConfig> roles) {

    private static final int MAX_ROLE_OVERRIDES = 20;

    public RunCell {
        if (config == null) {
            throw OfficiumException.badRequest("invalid_role_matrix", "A cell needs its model and effort");
        }
        Map<String, RunConfig> copy = new LinkedHashMap<>();
        if (roles != null) {
            if (roles.size() > MAX_ROLE_OVERRIDES) {
                throw OfficiumException.badRequest("invalid_role_matrix",
                        "At most " + MAX_ROLE_OVERRIDES + " role overrides per cell");
            }
            roles.forEach((role, run) -> {
                RoleMatrix.requireRoleId(role);
                copy.put(role, run);
            });
        }
        roles = Collections.unmodifiableMap(copy);
    }

    public static RunCell of(RunConfig config) {
        return new RunCell(config, Map.of());
    }

    /** The role's own config in this cell, or the cell's. */
    public RunConfig forRole(String role) {
        return roles.getOrDefault(role, config);
    }

    /** Read from {@code {model, effort, roles?: {<role>: {model, effort}}}}. */
    static RunCell fromWire(Object wire) {
        RunConfig config = RunConfig.fromWire(wire);
        Map<String, RunConfig> roles = new LinkedHashMap<>();
        Object byRole = ((Map<?, ?>) wire).get("roles");
        if (byRole instanceof Map<?, ?> entries) {
            entries.forEach((role, run) -> roles.put(String.valueOf(role), RunConfig.fromWire(run)));
        } else if (byRole != null) {
            throw OfficiumException.badRequest("invalid_role_matrix", "A cell's roles are {<role>: {model, effort}}");
        }
        return new RunCell(config, roles);
    }

    public Map<String, Object> toWire() {
        Map<String, Object> wire = new LinkedHashMap<>(config.toWire());
        if (!roles.isEmpty()) {
            Map<String, Object> byRole = new LinkedHashMap<>();
            roles.forEach((role, run) -> byRole.put(role, run.toWire()));
            wire.put("roles", byRole);
        }
        return wire;
    }
}
