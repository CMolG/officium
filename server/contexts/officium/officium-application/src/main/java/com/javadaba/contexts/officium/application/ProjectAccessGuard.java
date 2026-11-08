package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.ProjectMember;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.ProjectMemberRepository;
import com.javadaba.contexts.officium.domain.ports.ProjectRepository;
import com.javadaba.contexts.officium.domain.ports.TeamRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * "Not yours = not found" (contract §1.2), in one place: a project the caller isn't a member of
 * answers 404, for reads and writes alike, and a viewer gets {@code 403 read_only} on writes
 * because they already know the project exists. Every service that touches a project (JDB-215,
 * JDB-216) goes through this instead of re-deriving the rule.
 */
@ApplicationScoped
public class ProjectAccessGuard {

    private final ProjectRepository projects;
    private final ProjectMemberRepository members;
    private final TeamRepository teams;

    public ProjectAccessGuard(ProjectRepository projects, ProjectMemberRepository members, TeamRepository teams) {
        this.projects = projects;
        this.members = members;
        this.teams = teams;
    }

    public Access requireAccess(UUID projectId, UUID accountId) {
        Project project = projects.findById(projectId)
                .orElseThrow(() -> OfficiumException.notFound("project_not_found", "No such project"));
        Role role = roleOf(project, accountId)
                .orElseThrow(() -> OfficiumException.notFound("project_not_found", "No such project"));
        return new Access(project, role);
    }

    public Access requireAtLeast(UUID projectId, UUID accountId, Role required) {
        Access access = requireAccess(projectId, accountId);
        if (!access.role().atLeast(required)) {
            throw OfficiumException.forbidden("read_only", "Viewers cannot write to this project");
        }
        return access;
    }

    /** Whether the account can still read the project, by the same rule as {@link #requireAccess}. */
    public boolean hasAccess(UUID projectId, UUID accountId) {
        return projects.findById(projectId).flatMap(project -> roleOf(project, accountId)).isPresent();
    }

    /**
     * Every project the account can see, archived ones included, by the same rule as
     * {@link #requireAccess}: what another context lists for that account (Fluxor's shared harness
     * projects, card://JAVA-2006).
     */
    public List<Project> accessibleTo(UUID accountId) {
        return projects.listForAccount(accountId, null, false, null);
    }

    /** The best of a direct membership and every team grant (JAVA-57, contract §8.5): taking away
     *  one of them never takes away what the other gives. */
    private Optional<Role> roleOf(Project project, UUID accountId) {
        if (project.ownerAccountId().equals(accountId)) {
            return Optional.of(Role.OWNER);
        }
        Optional<Role> direct = members.find(project.id(), accountId).map(ProjectMember::role);
        Optional<Role> viaTeam = teams.bestGrant(project.id(), accountId);
        return Stream.of(direct, viaTeam).flatMap(Optional::stream).min(Comparator.comparingInt(Role::ordinal));
    }

    public record Access(Project project, Role role) {
    }
}
