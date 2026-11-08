package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.OrganizationService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;

/**
 * The people and teams operations (JAVA-57, contract §8.5), moved out of {@link OfficiumMcpRegistry}
 * so the registry doesn't grow past its allowance (JAVA-1009).
 */
final class McpOrganization {

    private static final String READ = McpOperation.READ;
    private static final String WRITE = McpOperation.WRITE;
    private static final String SCOPE_READ = "officium:read";
    private static final String SCOPE_WRITE = "officium:write";
    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String EX_CARD = "22222222-2222-2222-2222-222222222222";

    private McpOrganization() {
    }

    /** The caller's people and teams; no projectId, they span the caller's projects. */
    static void addOrganizationOperations(List<McpOperation<OfficiumCaller>> list, OrganizationService organization) {
        list.add(new McpOperation<>("organization.people",
                "Everyone with access to a project you own (you excepted): each with their projects, role and "
                        + "whether it's direct or through a team, and their teams.",
                READ, SCOPE_READ, McpSchemas.schema(Map.of(), List.of()), Map.of(),
                (caller, params) -> organization.people(caller.accountId())));

        list.add(new McpOperation<>("organization.collaborators",
                "How many collaborators you include across all your projects, and the cap: `{used, cap}`. Past "
                        + "the cap, a new person needs the Business plan (`business_plan_required`).",
                READ, SCOPE_READ, McpSchemas.schema(Map.of(), List.of()), Map.of(),
                (caller, params) -> organization.collaborators(caller.accountId())));

        list.add(new McpOperation<>("teams.list", "Your teams, with their members and the projects they're granted.",
                READ, SCOPE_READ, McpSchemas.schema(Map.of(), List.of()), Map.of(),
                (caller, params) -> organization.list(caller.accountId())));

        list.add(new McpOperation<>("teams.create", "Creates a team you own.", WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("name", McpSchemas.string(), "description", McpSchemas.string()),
                        List.of("name")),
                Map.of("name", "Platform"),
                (caller, params) -> organization.create(caller.accountId(), McpParams.requiredString(params, "name"),
                        McpParams.string(params, "description", null), caller.actor())));

        list.add(new McpOperation<>("teams.update", "Renames a team or changes its description.", WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("teamId", McpSchemas.string(), "expectedVersion", McpSchemas.integer(), "name",
                        McpSchemas.string(), "description", McpSchemas.string()), List.of("teamId", "expectedVersion")),
                Map.of("teamId", EX_CARD, "expectedVersion", 1, "name", "Platform team"),
                (caller, params) -> organization.update(caller.accountId(), McpParams.uuid(params, "teamId"),
                        McpParams.integer(params, "expectedVersion", 0), McpParams.string(params, "name", null),
                        McpParams.string(params, "description", null), caller.actor())));

        list.add(new McpOperation<>("teams.delete",
                "Deletes a team: everything it granted goes with it, nobody's direct membership does.", WRITE,
                SCOPE_WRITE,
                McpSchemas.schema(Map.of("teamId", McpSchemas.string(), "expectedVersion", McpSchemas.integer()),
                        List.of("teamId", "expectedVersion")),
                Map.of("teamId", EX_CARD, "expectedVersion", 1),
                (caller, params) -> {
                    organization.delete(caller.accountId(), McpParams.uuid(params, "teamId"),
                            McpParams.integer(params, "expectedVersion", 0), caller.actor());
                    return Map.of("deleted", true);
                }));

        list.add(new McpOperation<>("teams.addMember",
                "Adds a Javadaba account to a team by email (`account_not_found`, `ambiguous_account`). Past the "
                        + "collaborator limit, a new person is refused (`business_plan_required`).",
                WRITE,
                SCOPE_WRITE,
                McpSchemas.schema(Map.of("teamId", McpSchemas.string(), "email", McpSchemas.string()),
                        List.of("teamId", "email")),
                Map.of("teamId", EX_CARD, "email", "someone@example.com"),
                (caller, params) -> organization.addMember(caller.accountId(), McpParams.uuid(params, "teamId"),
                        McpParams.requiredString(params, "email"), caller.actor())));

        list.add(new McpOperation<>("teams.removeMember", "Takes an account out of a team.", WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("teamId", McpSchemas.string(), "accountId", McpSchemas.string()),
                        List.of("teamId", "accountId")),
                Map.of("teamId", EX_CARD, "accountId", EX_PROJECT),
                (caller, params) -> organization.removeMember(caller.accountId(), McpParams.uuid(params, "teamId"),
                        McpParams.uuid(params, "accountId"), caller.actor())));

        list.add(new McpOperation<>("teams.grantProject",
                "Grants one of your projects to a team as editor or viewer (or changes the role it grants). Past "
                        + "the collaborator limit, a team whose members are not all counted is refused "
                        + "(`business_plan_required`).",
                WRITE,
                SCOPE_WRITE,
                McpSchemas.schema(Map.of("teamId", McpSchemas.string(), "projectId", McpSchemas.string(), "role",
                        McpSchemas.stringEnum("editor", "viewer")), List.of("teamId", "projectId", "role")),
                Map.of("teamId", EX_CARD, "projectId", EX_PROJECT, "role", "editor"),
                (caller, params) -> organization.grantProject(caller.accountId(), McpParams.uuid(params, "teamId"),
                        McpParams.uuid(params, "projectId"), Role.fromWire(McpParams.requiredString(params, "role")),
                        caller.actor())));

        list.add(new McpOperation<>("teams.revokeProject", "Takes a project away from a team.", WRITE, SCOPE_WRITE,
                McpSchemas.schema(Map.of("teamId", McpSchemas.string(), "projectId", McpSchemas.string()),
                        List.of("teamId", "projectId")),
                Map.of("teamId", EX_CARD, "projectId", EX_PROJECT),
                (caller, params) -> organization.revokeProject(caller.accountId(), McpParams.uuid(params, "teamId"),
                        McpParams.uuid(params, "projectId"), caller.actor())));
    }
}
