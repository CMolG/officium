package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * A group of accounts that one account owns and grants roles on its own projects to (JAVA-57,
 * contract §8.5). It is not an identity: every member is an ecosystem account (invariant 7), and a
 * team only adds what is project-scoped -- a role.
 */
public record Team(UUID id, UUID ownerAccountId, String name, String description, int version, Instant createdAt,
        Instant updatedAt) {

    public Team {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(ownerAccountId, "ownerAccountId");
        if (name == null || name.isBlank()) {
            throw OfficiumException.badRequest("name_required", "A team needs a name");
        }
        name = name.strip();
        description = description == null ? "" : description;
    }

    public Team edited(String newName, String newDescription, Instant now) {
        return new Team(id, ownerAccountId, newName == null ? name : newName,
                newDescription == null ? description : newDescription, version + 1, createdAt, now);
    }

    /** A grant is editor or viewer; ownership is never handed out through a team. */
    public static Role requireGrantable(Role role) {
        if (role == null || role == Role.OWNER) {
            throw OfficiumException.badRequest("invalid_team_role", "A team grants editor or viewer");
        }
        return role;
    }

    public record Member(UUID teamId, UUID accountId, Instant addedAt) {
    }

    public record Grant(UUID teamId, UUID projectId, Role role, Instant createdAt) {
    }
}
