package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.AgentWorkService;
import com.javadaba.contexts.officium.application.CardDetailService;
import com.javadaba.contexts.officium.application.CardFormService;
import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.application.CardView;
import com.javadaba.contexts.officium.application.CardWorkflowService;
import com.javadaba.contexts.officium.application.ReviewCreationGuard;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.CardWorkflow;
import com.javadaba.contexts.officium.domain.HumanCardContract;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;
import com.javadaba.platform.mcp.McpToolException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** {@code cards.create}, in its own class because {@link OfficiumMcpRegistry} is at its size allowance. */
final class McpCardCreate {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpCardCreate() {
    }

    static McpOperation<OfficiumCaller> operation(CardService cards, CardFormService cardForms,
            CardDetailService details, AgentWorkService agentWork, CardWorkflowService workflows) {
        return new McpOperation<>("cards.create",
                "Creates one card, or several at once with `cards: [...]` (each shaped like the top-level fields, "
                        + "max 50). Pass `clientKey` to make a retry idempotent: the same key returns the FIRST "
                        + "card instead of creating a duplicate -- always set it when you might retry. Set "
                        + "`category` from meta.states' `categoryGuide`, which says what each one means and the "
                        + "rules it brings, and `signals` for what about the work brings roles the category alone "
                        + "does not (e.g. `touches-ui`). A spike takes a `subtype`, `technical` (the default) or "
                        + "`ux-ui`, which picks its roles; any other category refuses one (`subtype_not_allowed`). "
                        + "An epic is never created into a sprint "
                        + "(`epic_not_plannable`). With no `status` a card is born in `refine`, a `routine` one in "
                        + "`todo`, and yours needs a description line `Runbook: <path | URL | card key>` to start "
                        + "there (`contract_unmet`). A `technicalDebt` card of yours created in `todo` or `doing` "
                        + "needs two: `Slows down: ...` or `Risk: ...`, and `Cost of not paying: ...`; a "
                        + "`regression` one needs `Last good: <commit | tag | release>` and `First bad: ...`; a "
                        + "`refactor` one needs `Restructured because: <why>` and `Ends in: <the structure it "
                        + "ends in>`; an `infrastructure` one needs `Topology: <what runs where>`, `Cost and "
                        + "capacity: ...` and `Rollback: <how it is undone>`; a `hotfix` one needs `Impact: <confirmed "
                        + "in production>`, `Affected version: <what production runs>` and `Reproduction: <minimal "
                        + "steps>` (or `Repro:`, `Steps to reproduce:`), and with those three and no `status` it is "
                        + "born in `todo`, whoever creates it; a `spike` one needs `Question: <the question>`, "
                        + "`Time box: <n>h` or `<n>d` and `Success criterion: <the answer that closes it>` (or "
                        + "`Answer that closes it:`); a `testing` one needs `Covers: <what gets covered, and why>` (or "
                        + "`What gets covered:`) and `Left out: <what is not covered>`; a `documentation` one needs "
                        + "`Audience: <who it is for>` (or `Who it is for:`) and `Purpose: <what it is for>` (or `What "
                        + "it is for:`). Any of these labels is also "
                        + "met by a "
                        + "section: a heading with the label (`## Rollback`) followed by its text. A spike of an "
                        + "`ai` card in `doing` carries `timeBoxEndsAt`, its last move into `doing` plus its time "
                        + "box, and once that passes the board moves it to `ready` with what exists, for the "
                        + "delivery analyst (a `human` spike, or one whose time box does not parse, is never moved). "
                        + "A `human` card takes a `form` (see cards.attachForm) and is born with it: the form is "
                        + "checked first, so an invalid one saves no card. An agent's `human` card without a form "
                        + "needs a description line `No form: <reason>` (`contract_unmet`), and the answer carries the card's "
                        + "detail with its `form`. A review creates no cards: a session working on a card passes it as "
                        + "`workingOn` (its key), and while that card is in Review and the session is live on it the "
                        + "create is refused (`review_creates_no_cards`) and the card is sent back instead. Any other "
                        + "session, on the same computer or not, creates as usual. A `workflow` (as cards.setWorkflow "
                        + "takes it) is checked against its card before anything is created (`workflow_invalid`, "
                        + "nothing created), then set on the card.",
                McpOperation.WRITE, "officium:write",
                McpSchemas.schema(properties(), List.of("projectId")),
                Map.of("projectId", EX_PROJECT, "title", "New card"),
                (caller, params) -> {
                    UUID projectId = McpParams.uuid(params, "projectId");
                    ReviewCreationGuard.requireNotReviewing(agentWork, caller.accountId(), projectId,
                            McpParams.string(params, "workingOn", null));
                    if (params.hasNonNull("cards")) {
                        List<CardService.NewCard> batch = new ArrayList<>();
                        List<Map<String, Object>> documents = new ArrayList<>();
                        for (JsonNode item : params.get("cards")) {
                            if (item.hasNonNull("form")) {
                                throw McpToolException.invalid("A form goes on one card: create the card with its "
                                        + "form on its own", "/cards");
                            }
                            CardService.NewCard card = OfficiumMcpRegistry.toNewCard(item);
                            Map<String, Object> document = McpCardWorkflow.document(item);
                            check(workflows, projectId, card, document);
                            HumanCardContract.requireForm(caller.actor().kind(), card.executor(), false,
                                    card.description());
                            batch.add(card);
                            documents.add(document);
                        }
                        List<CardView> created = cards.createBatch(caller.accountId(), projectId, batch,
                                caller.actor());
                        List<CardView> views = new ArrayList<>();
                        for (int i = 0; i < created.size(); i++) {
                            views.add(attach(workflows, caller, projectId, created.get(i), documents.get(i)));
                        }
                        return views;
                    }
                    CardService.NewCard card = OfficiumMcpRegistry.toNewCard(params);
                    Map<String, Object> document = McpCardWorkflow.document(params);
                    check(workflows, projectId, card, document);
                    HumanCardContract.requireForm(caller.actor().kind(), card.executor(), params.hasNonNull("form"),
                            card.description());
                    if (params.hasNonNull("form")) {
                        CardView created = cardForms.create(caller.accountId(), projectId, card,
                                McpCardForms.toFormSpec(params.get("form")), caller.actor());
                        return details.get(caller.accountId(), projectId,
                                attach(workflows, caller, projectId, created, document).key());
                    }
                    return attach(workflows, caller, projectId,
                            cards.create(caller.accountId(), projectId, card, caller.actor()), document);
                });
    }

    /** Refuses a card's workflow before anything is created, so an invalid one saves no card (card://JAVA-1591). */
    private static void check(CardWorkflowService workflows, UUID projectId, CardService.NewCard card,
            Map<String, Object> document) {
        if (document != null) {
            workflows.check(projectId, document, card.category(), card.subtype(), card.signals(), card.epic());
        }
    }

    /** Sets the card's workflow once it exists, answering the card as it is then; a retried create is a no-op. */
    private static CardView attach(CardWorkflowService workflows, OfficiumCaller caller, UUID projectId,
            CardView view, Map<String, Object> document) {
        return document == null
                ? view
                : workflows.set(caller.accountId(), projectId, view.id(), view.version(), document, caller.actor());
    }

    private static Map<String, Object> properties() {
        Map<String, Object> props = new LinkedHashMap<>(OfficiumMcpRegistry.newCardProperties(true));
        props.put("workingOn", McpSchemas.string());
        props.put("workflow", CardWorkflow.schema());
        return props;
    }
}
