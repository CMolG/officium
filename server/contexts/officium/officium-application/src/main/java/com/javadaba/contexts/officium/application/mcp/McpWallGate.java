package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.AgentWorkService;
import com.javadaba.contexts.officium.application.CardFormService;
import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.application.CardView;
import com.javadaba.contexts.officium.application.ReviewCreationGuard;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.ActorKind;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.HumanCardContract;
import com.javadaba.platform.mcp.McpParams;

import java.util.List;
import java.util.UUID;

/**
 * What {@code cards.requestHuman} checks before a wall is created: a review creates no cards (the review
 * guard), and an agent's wall is born with a form or says why it has none (JAVA-1783). Its own class so the
 * operation registry stays under its size bar.
 */
final class McpWallGate {

    private McpWallGate() {
    }

    static void require(AgentWorkService agentWork, OfficiumCaller caller, UUID projectId, JsonNode params) {
        ReviewCreationGuard.requireNotReviewing(agentWork, caller.accountId(), projectId,
                McpParams.string(params, "workingOn", null));
        HumanCardContract.requireForm(caller.actor().kind(), Executor.HUMAN, params.hasNonNull("form"),
                McpParams.string(params, "why", "") + "\n" + McpParams.string(params, "steps", ""));
    }

    /** cards.setExecutor: an existing card an agent turns human answers to the same contract as a new wall. */
    static CardView setExecutor(CardService cards, CardFormService cardForms, OfficiumCaller caller, JsonNode params) {
        UUID projectId = McpParams.uuid(params, "projectId");
        UUID cardId = McpCardRef.id(cards, caller, params);
        Executor executor = Executor.fromWire(McpParams.requiredString(params, "executor"));
        if (executor == Executor.HUMAN && caller.actor().kind() == ActorKind.AGENT) {
            String keyOrId = cardId.toString();
            HumanCardContract.requireForm(caller.actor().kind(), executor,
                    cardForms.find(caller.accountId(), projectId, keyOrId).isPresent(),
                    cards.get(caller.accountId(), projectId, keyOrId).description());
        }
        return cards.setExecutor(caller.accountId(), projectId, cardId,
                McpParams.integer(params, "expectedVersion", 0), executor,
                params.hasNonNull("assignee") ? OfficiumMcpRegistry.toAssignee(params.get("assignee")) : null,
                caller.actor());
    }

    /** One cards.needsHuman item: the card's own fields, plus whether a person's wall has a form (JAVA-1783). */
    record NeedsHumanItem(@JsonUnwrapped CardView card, boolean hasForm) {
    }

    /** cards.needsHuman: each wall says whether it carries a form, so the board can find the ones without. */
    static List<NeedsHumanItem> needsHuman(CardService cards, CardFormService cardForms, OfficiumCaller caller,
            JsonNode params) {
        UUID projectId = McpParams.uuid(params, "projectId");
        return cards.needsHuman(caller.accountId(), projectId, McpParams.string(params, "assignee", null)).stream()
                .map(card -> new NeedsHumanItem(card,
                        cardForms.find(caller.accountId(), projectId, card.id().toString()).isPresent()))
                .toList();
    }
}
