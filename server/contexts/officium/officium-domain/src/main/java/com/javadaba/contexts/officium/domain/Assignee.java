package com.javadaba.contexts.officium.domain;

import java.util.UUID;

/** Either a real account ({@code accountId} set) or a free-text name (a contractor with no
 *  Javadaba account, say). {@code name} is always present -- it's what the board renders. */
public record Assignee(UUID accountId, String name) {

    public Assignee {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("An assignee needs a name");
        }
    }
}
