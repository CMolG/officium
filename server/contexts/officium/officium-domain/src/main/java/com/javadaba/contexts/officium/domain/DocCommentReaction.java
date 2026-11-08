package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.UUID;

/** One account's one emoji on one comment (JAVA-797). Reactions don't count against the allowance. */
public record DocCommentReaction(UUID commentId, String emoji, UUID accountId, String name, Instant at) {

    public DocCommentReaction {
        if (!SingleEmoji.is(emoji)) {
            throw OfficiumException.badRequest("invalid_reaction", "A reaction is exactly one emoji");
        }
    }
}
