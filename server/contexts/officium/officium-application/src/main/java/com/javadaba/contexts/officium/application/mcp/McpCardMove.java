package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.AgentWorkService;
import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.RejectionRules;
import com.javadaba.contexts.officium.domain.ReviewReturns;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** {@code cards.move}, in its own class because {@link OfficiumMcpRegistry} is at its size allowance. */
final class McpCardMove {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";
    private static final String EX_CARD = "22222222-2222-2222-2222-222222222222";

    private McpCardMove() {
    }

    static McpOperation<OfficiumCaller> operation(CardService cards, AgentWorkService agentWork) {
        return new McpOperation<>("cards.move", DESCRIPTION, McpOperation.WRITE, "officium:write",
                McpSchemas.schema(
                        Map.of("projectId", McpSchemas.string(), "cardId", McpSchemas.string(), "expectedVersion",
                                McpSchemas.integer(), "status", McpEnums.statusEnum(), "position",
                                McpSchemas.integer(), "rejection", McpSchemas.objectOf(Map.of(
                                        "reason", McpEnums.rejectionEnum(), "note", McpSchemas.string(),
                                        "card", McpSchemas.string()), List.of("reason", "note")),
                                "reviewReturn", McpSchemas.objectOf(Map.of(
                                        "reasons", McpSchemas.array(McpEnums.reviewReturnEnum()),
                                        "findings", McpSchemas.string(), "role", McpSchemas.string(),
                                        "ruleViolations", McpSchemas.array(McpSchemas.string())),
                                        List.of("reasons", "findings")),
                                "qualityScorecard", McpQualityScorecard.schema(), "role", McpSchemas.string()),
                        List.of("projectId", "cardId", "expectedVersion", "status", "position")),
                Map.of("projectId", EX_PROJECT, "cardId", EX_CARD, "expectedVersion", 1, "status", "doing",
                        "position", 0),
                (caller, params) -> {
                    Status status = Status.fromWire(McpParams.requiredString(params, "status"));
                    return OfficiumMcpRegistry.following(agentWork, params, caller.actor(),
                            AgentWorkService.Signal.ofMove(status),
                            cards.move(caller.accountId(), McpParams.uuid(params, "projectId"),
                                    McpCardRef.id(cards, caller, params),
                                    McpParams.integer(params, "expectedVersion", 0), status,
                                    McpParams.integer(params, "position", 0), rejection(params.path("rejection")),
                                    reviewReturn(params.path("reviewReturn")),
                                    McpQualityScorecard.read(params.path("qualityScorecard")),
                                    McpParams.string(params, "role", null), caller.actor()));
                });
    }

    private static RejectionRules.Request rejection(JsonNode raw) {
        return raw.isObject()
                ? new RejectionRules.Request(McpParams.string(raw, "reason", null),
                        McpParams.string(raw, "note", null), McpParams.string(raw, "card", null))
                : null;
    }

    private static ReviewReturns.Request reviewReturn(JsonNode raw) {
        if (!raw.isObject()) {
            return null;
        }
        List<String> reasons = new ArrayList<>();
        raw.path("reasons").forEach(reason -> reasons.add(reason.asText()));
        List<String> violations = new ArrayList<>();
        raw.path("ruleViolations").forEach(rule -> violations.add(rule.asText()));
        return new ReviewReturns.Request(reasons, McpParams.string(raw, "findings", null),
                McpParams.string(raw, "role", null), violations);
    }

    private static final String DESCRIPTION = "Moves a card to a status and a 0-based position within that column. "
            + "`done` is Completed: "
            + "move a card there once its work is verified in production. It has no column on the "
            + "board (people see it from \"View completed\"), and a card moved there goes to the end "
            + "whatever `position` says. `rejected` discards a card that will not be done, kept and readable with "
            + "its reason (no column either: \"View rejected\"): send `rejection` {reason, note, card?}, where "
            + "`reason` is one of meta.states' `rejectionReasons`, `note` says what was wrong (at most 2,000 "
            + "characters) and `card` is the key of the card it names, required for duplicate, superseded and "
            + "wrong-split. A completed card is never rejected (`card_done_not_rejectable`). A rejected card is not "
            + "finished: it keeps blocking the cards in its `blocks`, so re-point those links to the card it names, "
            + "or remove them with a comment on each. It reopens only in `refine`, which clears its rejection "
            + "(`rejected_reopens_to_refine`). An epic is rejected only once none of its children is open. While "
            + "meta.states' `rejectionEnabled` is false, a move to rejected answers `rejection_disabled`: leave the "
            + "card where it is with a comment naming the reason. "
            + "Sending a card back from `review` or `deploy` to `refine`, `todo`, `doing` or `ready` needs "
            + "`reviewReturn` {reasons, findings, role?}: `reasons` are one or more of meta.states' "
            + "`reviewReturnReasons` (none repeated), `findings` says what was wrong (at most 20,000 characters) and "
            + "is posted as a comment on the card, and `role` is the role you reviewed as, required of an agent and "
            + "one of the card's `eligibleRoles`. Without it the move answers `review_return_required`; on a move "
            + "that is not a send-back it answers `review_return_without_send_back`. The card keeps each send-back "
            + "in `reviewReturns`; add `ruleViolations` to it, ids `<dimension>:<rule>` from meta.states' "
            + "`qualityRules`, naming the engineering rules the work broke. The third send-back from review in a row "
            + "lands in `refine` with an escalation in its findings (`reviewRework` counts the streak). An approval, "
            + "`review` to `deploy` or `done`, carries `qualityScorecard` {architecture, clean_code, testing_rigor, runtime_guardrails, "
            + "ux_and_polish (only on a card with the touches-ui signal), each `clean` or `minor_observations`, "
            + "observations?, role}: required of an agent on an ai card (`contract_unmet`), its `role` one of the "
            + "card's `eligibleRoles`; a failed pillar is a send-back, not an approval. The approval also needs a "
            + "comment posted since the card last entered review with a `Rules checked:` line and a table "
            + "`| rule | verdict | evidence |` (verdict `pass`, `violated`, `not verified` or `not applicable`), "
            + "none of its rows `violated` (`review_rule_violated`: a violated rule is a send-back), and on a "
            + "`touches-ui` card a `Screens:` line in the same comment (`contract_unmet`). The card keeps every exit "
            + "from review in `reviewOutcomes`. "
            + "`expectedVersion` conflict rules are the same as cards.update. "
            + "An epic with no children can only go to `refine` or `rejected` (`epic_has_no_children`): give it a "
            + "child first. An `ai` card leaves `refine` for `todo` or `doing` only with a workflow and an "
            + "`actionPlan` (cards.update), whoever moves it; a refusal (`contract_unmet`) names each missing slot. "
            + "The plan opens `Base: <control branch | main | branch name>` and carries the workflow's refine role "
            + "as `Role: <id>`. `routine`, `hotfix` and epics are exempt. "
            + "A `routine` card of yours leaves `refine` only naming its runbook, and "
            + "reaches `review`, `deploy` or `done` only after a comment with the run's evidence; a "
            + "`technicalDebt` one leaves `refine` only with `Slows down:` or `Risk:` and `Cost of not "
            + "paying:` lines; a `regression` one leaves `refine` only with `Last good:` and `First "
            + "bad:` lines, and reaches `review`, `deploy` or `done` only after a comment of this run "
            + "with a `Caused by:` line naming the commit hash, `#PR` or commit/pull URL that broke "
            + "it; an `enhancement` one reaches `review`, `deploy` or `done` only after a comment of "
            + "this run with a `Public contracts:` line stating each public surface the change "
            + "touched (a route, a wire field, a URL, a stored format) and how it keeps its shape, or "
            + "`none` (the board checks the line is there, the reviewer that it is true); a "
            + "`refactor` one leaves `refine` only with `Restructured because:` and `Ends in:` lines, "
            + "and reaches `review`, `deploy` or `done` only after a comment of this run with the same "
            + "`Public contracts:` line (the board checks the line; that it is true, that the tests "
            + "are green and that none was modified are the reviewer's); a `bug` one reaches "
            + "`review`, `deploy` or `done` only after this run's comments carry a `Cause:` line "
            + "(what was wrong, not the symptom) and a `Reproduced by:` line (the test seen red before "
            + "the fix and green after it), in one comment or two (the board checks the lines; that "
            + "they are true is the reviewer's); an `infrastructure` one leaves `refine` only with "
            + "`Topology:`, `Cost and capacity:` and `Rollback:` lines (or `## Topology`-style sections "
            + "with their text), and reaches `review`, `deploy` or `done` only after this run's "
            + "comments carry a `Proven by:` line (the command or run that applied it, and what it "
            + "showed) and an `Observed by:` line (the metric, log or alert that shows it working), in "
            + "one comment or two (the board checks the lines; that they are true, that the change is "
            + "applied as code and that the signal is live in production are the reviewer's and the "
            + "deploy's); a `hotfix` one leaves `refine` only with `Impact:`, `Affected version:` and "
            + "`Reproduction:` lines, and reaches `review`, `deploy` or `done` only linked (`related` or "
            + "`blocks`, either way) to a `bug` or `regression` card for the root cause and the test that "
            + "pins it (create it with `related: [<hotfix key>]`, or cards.link it; that the branch is "
            + "cut from what production runs and the diff is minimal are the reviewer's and the "
            + "release's); a `userStory` one reaches `deploy` or `done` only once every card "
            + "blocking it is in `deploy` or `done`; a `spike` one leaves `refine` only with `Question:`, "
            + "`Time box: <n>h | <n>d` and `Success criterion:` lines; a `testing` one leaves `refine` "
            + "only with `Covers:` (or `What gets covered:`, or a `## What gets covered, and why` "
            + "section) and `Left out:` lines, and reaches `review`, `deploy` or `done` only after a "
            + "comment of this run with a `Gate:` line naming the run of the project's gate that shows "
            + "its tests green, and its result (inside an epic, the checks it ran and the epic's test "
            + "card; the board checks the line, the reviewer that the run is real, green and "
            + "deterministic, and that every red it found was fixed in the test or carded); a "
            + "`documentation` one leaves `refine` only with `Audience:` (or `Who it is for:`) and "
            + "`Purpose:` (or `What it is for:`) lines, and reaches `review`, `deploy` or `done` only after "
            + "a comment of this run with a `Verified against:` line naming the code it was checked "
            + "against: files, commands run, commits (the board checks the line; that it is true and names "
            + "code rather than another document, that the content documents what the code does, not what "
            + "it was meant to do, and that what no longer exists was deleted are the reviewer's) "
            + "(`contract_unmet`). A spike's time "
            + "box counts from its last move into `doing` (`timeBoxEndsAt` on the card), so moving it "
            + "back and starting it again gives it a new one; when it ends, the board moves an `ai` "
            + "spike to `ready` with what exists and says so in a comment. A spike never goes to `deploy` "
            + "(`spike_skips_deploy`): its review approves it straight to `done`. Name the `role` you ran the "
            + "phase you leave as, one of the card's `eligibleRoles`: the move keeps it, with the project's "
            + "active work profile and that role's model and effort, as the phase run Contributions reads by "
            + "AI profile (`metrics.get` `profiles`).";
}
