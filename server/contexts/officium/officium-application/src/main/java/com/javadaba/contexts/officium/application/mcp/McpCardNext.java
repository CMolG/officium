package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.AgentWorkService;
import com.javadaba.contexts.officium.application.CheckpointService;
import com.javadaba.contexts.officium.application.PhasedPick;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * {@code cards.next}, {@code cards.unit} and the sweep's {@code cards.setCheckpoint} (card://JAVA-1874,
 * card://JAVA-1876, card://JAVA-2001), in their own class because {@link OfficiumMcpRegistry} is at its size allowance.
 */
final class McpCardNext {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpCardNext() {
    }

    static List<McpOperation<OfficiumCaller>> operations(AgentWorkService agentWork) {
        return List.of(next(agentWork), unit(agentWork), checkpoint(agentWork));
    }

    private static McpOperation<OfficiumCaller> next(AgentWorkService agentWork) {
        return new McpOperation<>("cards.next",
                "The single `ai` card to work now, from any phase the loop works: Review, Ready, To do or "
                        + "Refine. A `hotfix` comes first, then a `security` card, whatever their priority or phase; "
                        + "then highest priority first; at equal priority Review > Ready > To do > Refine, so "
                        + "finished work is verified before new work starts. Never a blocked card, never a `human` card "
                        + "(hitting a wall on one? use cards.requestHuman, don't work around it), never a card an agent "
                        + "is working right now, and never an epic, whose work is its children, unless the project "
                        + "executes by epic (projects.executionMode): then a card of an open epic in To do, In progress "
                        + "or Review is answered as its EPIC, with `sweep` {phase, eligibleRoles, runConfig, runConfigs, "
                        + "mods, checkpoints, progress, next}: work every checkpoint of that phase in this one session, "
                        + "in order, on the sweep's run (cards.setCheckpoint between them). Every other answer has "
                        + "`sweep: null`. While a sprint is active, only its cards are eligible, unless `beyondSprint` is "
                        + "true and none is: then an eligible card outside it that blocks a blocked sprint card, else "
                        + "the best card in no sprint (move it into the sprint before working it). Null when nothing is "
                        + "eligible right now. `phases` (`review`, `ready`, `todo`, `refine`) answers only a unit in one "
                        + "of them. `excludeKeys` leaves out cards you cannot take (an epic's key leaves out all its "
                        + "cards): ask again with each refused key added, never search for a card of your own, since a "
                        + "search splits an epic's unit (card://JAVA-1890). Work it under its `phase` as one of its "
                        + "`eligibleRoles`; in Review, never approve work this session wrote.",
                McpOperation.READ, "officium:read",
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "beyondSprint", McpSchemas.bool(),
                        "excludeKeys", McpSchemas.array(McpSchemas.string()), "phases",
                        McpSchemas.array(McpSchemas.stringEnum("review", "ready", "todo", "refine"))),
                        List.of("projectId")),
                Map.of("projectId", EX_PROJECT),
                (caller, params) -> PhasedPick.pick(agentWork, caller.accountId(),
                        McpParams.uuid(params, "projectId"), params.path("beyondSprint").asBoolean(false),
                        McpParams.stringArray(params, "excludeKeys"),
                        PhasedPick.parse(McpParams.stringArray(params, "phases"))).orElse(null));
    }

    /**
     * card://JAVA-2001: a session that resumes a card it holds read the epic's own phase on {@code cards.get}, which is
     * its column (Action while it is In progress), and so missed a sweep waiting for its review.
     */
    private static McpOperation<OfficiumCaller> unit(AgentWorkService agentWork) {
        return new McpOperation<>("cards.unit",
                "The unit of work the card `key` is in, the shape `cards.next` answers: in a project that executes by "
                        + "epic, an epic or a card of an open epic answers the EPIC with its `sweep` {phase, "
                        + "eligibleRoles, runConfig, runConfigs, mods, checkpoints, progress, next}, and any other card "
                        + "answers itself with `sweep: null`. Read it to resume a card you hold: work it in the sweep's "
                        + "`phase`, as one of its `eligibleRoles`, on its run, never in the epic's own `phase` on "
                        + "cards.get, which is the epic's column. An epic with `sweep: null`, or an action sweep whose "
                        + "`next` is null, has nothing for a session now: release it.",
                McpOperation.READ, "officium:read",
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "key", McpSchemas.string()),
                        List.of("projectId", "key")),
                Map.of("projectId", EX_PROJECT, "key", "OFF-12"),
                (caller, params) -> agentWork.unit(caller.accountId(), McpParams.uuid(params, "projectId"),
                        McpParams.requiredString(params, "key")));
    }

    private static McpOperation<OfficiumCaller> checkpoint(AgentWorkService agentWork) {
        return new McpOperation<>("cards.setCheckpoint",
                "A sweep's move between checkpoints, in a project that executes by epic (`not_epic_mode` "
                        + "elsewhere). `state: \"in_progress\"` starts the checkpoint `cardId` (a To do card of an "
                        + "open epic, never a spike or a human card): it moves to In progress. `state: \"completed\"` "
                        + "needs `note`, the card's finishing comment (what was built, what was tested and what was "
                        + "not, with every line a move to Review asks for: the project's definition of done, the "
                        + "category's exit lines): it is commented and the card moves to Review, where it waits for "
                        + "the epic's review. Both go through cards.move and its contracts; a refused move names what "
                        + "is missing, and a second call whose note carries just that completes it. Answers "
                        + "{checkpoint, epic (its key), progress {completed, total}, next}: `next` is the checkpoint "
                        + "to work now, with its mods, null when none is left.",
                McpOperation.WRITE, "officium:write",
                McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string(),
                        "state", McpSchemas.stringEnum("in_progress", "completed"), "note", McpSchemas.string()),
                        List.of("projectId", "cardId", "state")),
                Map.of("projectId", EX_PROJECT, "cardId", "OFF-12", "state", "completed", "note",
                        "Built the parser; its unit tests pass. The full suite is the epic's test card's."),
                (caller, params) -> {
                    UUID projectId = McpParams.uuid(params, "projectId");
                    CheckpointService.Answer answer = agentWork.checkpoints().set(caller.accountId(), projectId,
                            McpParams.requiredString(params, "cardId"), McpParams.requiredString(params, "state"),
                            McpParams.string(params, "note", null), caller.actor());
                    agentWork.follow(projectId, agentWork.card(caller.accountId(), projectId,
                            answer.checkpoint().key()), caller.actor(),
                            "completed".equals(answer.checkpoint().state())
                                    ? AgentWorkService.Signal.STOPS
                                    : AgentWorkService.Signal.STARTS);
                    return answer;
                });
    }
}
