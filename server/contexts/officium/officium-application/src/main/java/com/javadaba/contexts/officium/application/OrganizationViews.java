package com.javadaba.contexts.officium.application;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Wire shapes of Organization (contract §8.5). */
public final class OrganizationViews {

    private OrganizationViews() {
    }

    public record TeamView(UUID id, String name, String description, int version, Instant createdAt,
            Instant updatedAt, List<TeamMemberView> members, List<TeamProjectView> projects) {
    }

    public record TeamMemberView(UUID accountId, String email, String name, Instant addedAt) {
    }

    public record TeamProjectView(UUID projectId, String name, String keyPrefix, String icon, String iconColor,
            String role) {
    }

    public record PersonView(UUID accountId, String email, String name, List<PersonProjectView> projects,
            List<TeamRef> teams) {
    }

    public record PersonProjectView(UUID projectId, String name, String keyPrefix, String role, String via,
            UUID teamId) {
    }

    public record TeamRef(UUID id, String name) {
    }
}
