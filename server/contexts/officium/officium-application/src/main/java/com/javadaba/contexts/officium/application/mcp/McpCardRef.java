package com.javadaba.contexts.officium.application.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.platform.mcp.McpParams;

import java.util.UUID;

/**
 * A call's {@code cardId} is a card's key ({@code "OFF-12"}) or its id (card://JAVA-2004). The services that take the id
 * as a {@link UUID} get it from here, a key resolved the way {@code cards.get} resolves its {@code keyOrId}; the
 * operations that hand the text on to a service (a comment, a status line) already read either, and do not need this.
 * Its own class because {@link OfficiumMcpRegistry} is at its size allowance.
 */
final class McpCardRef {

    private McpCardRef() {
    }

    /** The call's {@code cardId}, which it must carry. */
    static UUID id(CardService cards, OfficiumCaller caller, JsonNode params) {
        return resolved(cards, caller, params, McpParams.requiredString(params, "cardId"));
    }

    /** The call's {@code cardId}, or null when it leaves it out. */
    static UUID optionalId(CardService cards, OfficiumCaller caller, JsonNode params) {
        String reference = McpParams.string(params, "cardId", null);
        return reference == null ? null : resolved(cards, caller, params, reference);
    }

    private static UUID resolved(CardService cards, OfficiumCaller caller, JsonNode params, String reference) {
        try {
            return UUID.fromString(reference);
        } catch (IllegalArgumentException notAnId) {
            return cards.resolveCardId(caller.accountId(), McpParams.uuid(params, "projectId"), reference);
        }
    }
}
