package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.ProjectService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;

/**
 * The rules a project sets for everyone who writes in it: the languages its forms are written in (JAVA-1082) and its
 * standing Definition of Done (JAVA-1446). Out of {@link OfficiumMcpRegistry} at its allowance.
 */
final class McpProjectStandards {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpProjectStandards() {
    }

    static List<McpOperation<OfficiumCaller>> operations(ProjectService projects) {
        return List.of(formLanguages(projects), definitionOfDone(projects));
    }

    private static McpOperation<OfficiumCaller> formLanguages(ProjectService projects) {
        return new McpOperation<>("projects.setFormLanguages",
                "(Owner only) The languages every human card's form in this project is written in, the default "
                        + "first (JAVA-1082): a form missing any of them is refused naming the question and the "
                        + "language, and a form that names none gets them. [] removes the requirement. "
                        + "`expectedVersion` works as on projects.update.",
                McpOperation.WRITE, "officium:write",
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "expectedVersion", McpSchemas.integer(),
                        "formLanguages", McpSchemas.array(McpSchemas.string())),
                        List.of("projectId", "expectedVersion", "formLanguages")),
                Map.of("projectId", EX_PROJECT, "expectedVersion", 1, "formLanguages", List.of("en", "es")),
                (caller, params) -> projects.setFormLanguages(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.integer(params, "expectedVersion", 0), McpParams.stringArray(params, "formLanguages"),
                        caller.actor()));
    }

    private static McpOperation<OfficiumCaller> definitionOfDone(ProjectService projects) {
        return new McpOperation<>("projects.setDefinitionOfDone",
                "(Owner only) The project's standing Definition of Done (JAVA-1446): any number of short items within the project's token quota (`definitionOfDoneTokenQuota` on projects.get) every agent "
                        + "answers in its finishing comment when it moves a card out of its work phase into review, "
                        + "deploy or done. The comment carries a line `Definition of done:` and a table `| item | met / "
                        + "not applicable | evidence or reason |`, one row per item by its number: `met`, or `not "
                        + "applicable` with a reason. [] removes the checklist. `expectedVersion` works as on "
                        + "projects.update.",
                McpOperation.WRITE, "officium:write",
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "expectedVersion", McpSchemas.integer(),
                        "definitionOfDone", McpSchemas.array(McpSchemas.string())),
                        List.of("projectId", "expectedVersion", "definitionOfDone")),
                Map.of("projectId", EX_PROJECT, "expectedVersion", 1, "definitionOfDone",
                        List.of("Stale documents are fixed", "No junk is left in the tree")),
                (caller, params) -> projects.setDefinitionOfDone(caller.accountId(),
                        McpParams.uuid(params, "projectId"), McpParams.integer(params, "expectedVersion", 0),
                        McpParams.stringArray(params, "definitionOfDone"), caller.actor()));
    }
}
