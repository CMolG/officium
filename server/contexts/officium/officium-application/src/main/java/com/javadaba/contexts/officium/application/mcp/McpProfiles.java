package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.WorkProfileService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;

/** Work profiles, {@code roles.get}, {@code mods.list} and {@code mods.get} (cards JAVA-1524, JAVA-1569), out of {@link OfficiumMcpRegistry} at its allowance. */
final class McpProfiles {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String READ = McpOperation.READ;
    private static final String WRITE = McpOperation.WRITE;
    private static final String SCOPE_READ = "officium:read";
    private static final String SCOPE_WRITE = "officium:write";

    private McpProfiles() {
    }

    static List<McpOperation<OfficiumCaller>> operations(WorkProfileService profiles) {
        return List.of(
                new McpOperation<>("profiles.list",
                        "Your work profiles: Claude Standard and Claude Eco (built in for every account; `customized` "
                                + "when you edited your copy) and your own, each with its `version`. With `projectId`, "
                                + "`active` is the profile that project's owner activated, and `active: true` marks "
                                + "yours when it is the one. A profile is a distribution of roles, models, efforts and "
                                + "mods over the role matrix: the active one decides what cards.next hands and with which "
                                + "model and effort, under the project's own cells.",
                        READ, SCOPE_READ, McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of()),
                        Map.of("projectId", EX_PROJECT),
                        (caller, params) -> profiles.list(caller.accountId(),
                                McpParams.optionalUuid(params, "projectId"))),
                new McpOperation<>("profiles.get",
                        "One of your work profiles: `overrides` (what it changes on Officium's default matrix, the "
                                + "shape of projects.setRoleMatrix's) and `matrix` (the full matrix it gives a project "
                                + "with no cells of its own: roles per category/signal and phase, and `runs`, the model "
                                + "and effort of each cell, and `mods`, the mods each cell mounts).",
                        READ, SCOPE_READ,
                        McpSchemas.schema(Map.of("profileId", McpSchemas.string()), List.of("profileId")),
                        Map.of("profileId", "claude-eco"),
                        (caller, params) -> profiles.get(caller.accountId(),
                                McpParams.requiredString(params, "profileId"))),
                new McpOperation<>("profiles.upsert",
                        "Creates one of your work profiles or changes it, or your copy of a built-in. `profileId` is "
                                + "kebab-case; `expectedVersion` is the profile's (0 for a new one or an unedited "
                                + "built-in; a stale one answers `version_conflict`). `name` (required for a new "
                                + "profile), `overrides` (projects.setRoleMatrix's shape, `runs` included: {<row>: "
                                + "{<phase>: {model, effort, roles?}}}; `mods` too: {<row or signal>: {<phase>: [modId]}}, at "
                                + "most 20 per cell): each cell it names replaces the profile's, the rest are kept. `reset: true` drops your copy of a built-in. Changing a profile's cells needs the Personal plan (`plan_required` "
                                + "otherwise); `reset` stays free. At most 20 profiles.",
                        WRITE, SCOPE_WRITE,
                        McpSchemas.schema(Map.of("profileId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer(), "name", McpSchemas.string(), "overrides", McpSchemas.object(),
                                "reset", McpSchemas.bool()), List.of("profileId", "expectedVersion")),
                        Map.of("profileId", "claude-eco", "expectedVersion", 0, "overrides", Map.of("runs",
                                Map.of("refactor", Map.of("action", Map.of("model", "claude-sonnet-5-5", "effort",
                                        "high"))))),
                        (caller, params) -> profiles.upsert(caller.accountId(),
                                McpParams.requiredString(params, "profileId"), upsert(params))),
                new McpOperation<>("profiles.activate",
                        "(Owner only) Makes one of your work profiles the project's active one: its cards are then "
                                + "read against Officium's defaults, then this profile, then the project's own cells "
                                + "(projects.setRoleMatrix). Leave `profileId` out to go back to the defaults. "
                                + "`shuffle: true` turns on shuffle mode on that profile without changing it "
                                + "(card://JAVA-1858): each card's action and deploy phases run on a model and "
                                + "effort drawn near the configured cell (one model family down or up, never above "
                                + "the profile's highest, at low to xhigh effort), the same for the same card and "
                                + "phase on every read, so outcomes can be compared per model; planning, analysis "
                                + "and review keep their cell. Leave `shuffle` out to keep it as it is.",
                        WRITE, SCOPE_WRITE,
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "profileId", McpSchemas.string(),
                                "shuffle", McpSchemas.bool()), List.of("projectId")),
                        Map.of("projectId", EX_PROJECT, "profileId", "claude-eco", "shuffle", true),
                        (caller, params) -> profiles.activate(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.string(params, "profileId", null), McpParams.bool(params, "shuffle", null),
                                caller.actor())),
                new McpOperation<>("roles.list",
                        "The roles of Fluxor's catalog (ADR 0018): each has its `roleId`, `version`, `title`, "
                                + "`description` and `tags`; `board` in `tags` marks the roles that work cards. Their "
                                + "sheets come with roles.get, which takes a `roleId` from this list.",
                        READ, SCOPE_READ,
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                        Map.of("projectId", EX_PROJECT),
                        (caller, params) -> profiles.roles(caller.accountId(), McpParams.uuid(params, "projectId"))),
                new McpOperation<>("roles.get",
                        "A role's sheet from Fluxor's catalog (ADR 0018): its `body` in Markdown says what the role "
                                + "is for and what it must never do. Read it for the role you take from a card's "
                                + "`eligibleRoles`. The version is the one this project's harness pins, else the newest "
                                + "(`source` says which); `version` asks for exactly that one. An id the catalog lacks "
                                + "answers `unknown_role`: work under the card's category contract.",
                        READ, SCOPE_READ,
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "roleId", McpSchemas.string(),
                                "version", McpSchemas.integer()), List.of("projectId", "roleId")),
                        Map.of("projectId", EX_PROJECT, "roleId", "code-reviewer"),
                        (caller, params) -> profiles.role(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "roleId"),
                                McpParams.integer(params, "version", null))),
                new McpOperation<>("mods.list",
                        "The mods of Fluxor's catalog (ADR 0018, card://JAVA-1569): the rules a session follows on top "
                                + "of its role. Each has its `modId`, `title`, `description`, `tags`, `domains`, "
                                + "`incompatibleWith` (the mods it excludes) and `requiredBy` (the roles whose sheet "
                                + "requires it); `body` comes with mods.get. A work profile mounts mods on a matrix "
                                + "cell (`mods` in projects.setRoleMatrix and profiles.upsert).",
                        READ, SCOPE_READ,
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string()), List.of("projectId")),
                        Map.of("projectId", EX_PROJECT),
                        (caller, params) -> profiles.mods(caller.accountId(), McpParams.uuid(params, "projectId"))),
                new McpOperation<>("mods.get",
                        "A mod's sheet from Fluxor's catalog: its `body` in Markdown says what to do and what never to "
                                + "do. Read it for each id in `mods[<role>]` of cards.get / cards.next and follow it "
                                + "for the whole card. An id the catalog lacks answers `unknown_mod`.",
                        READ, SCOPE_READ,
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "modId", McpSchemas.string()),
                                List.of("projectId", "modId")),
                        Map.of("projectId", EX_PROJECT, "modId", "rule-enforcer"),
                        (caller, params) -> profiles.mod(caller.accountId(), McpParams.uuid(params, "projectId"),
                                McpParams.requiredString(params, "modId"))));
    }

    private static WorkProfileService.Upsert upsert(JsonNode params) {
        JsonNode overrides = params.path("overrides");
        return new WorkProfileService.Upsert(McpParams.string(params, "name", null),
                overrides.isObject() ? RoleMatrixJson.overrides(overrides) : null,
                McpParams.integer(params, "expectedVersion", 0), params.path("reset").asBoolean(false));
    }
}
