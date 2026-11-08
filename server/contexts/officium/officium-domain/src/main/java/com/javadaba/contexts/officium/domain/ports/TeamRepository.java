package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.Team;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeamRepository {

    Team insert(Team team);

    Optional<Team> findById(UUID teamId);

    List<Team> listByOwner(UUID ownerAccountId);

    boolean updateIfVersion(Team updated, int expectedVersion);

    boolean deleteIfVersion(UUID teamId, int expectedVersion);

    List<Team.Member> members(UUID teamId);

    /** {@code false} when the account was already a member. */
    boolean addMember(Team.Member member);

    boolean removeMember(UUID teamId, UUID accountId);

    List<Team.Grant> grants(UUID teamId);

    /** Grants the project, or changes the role it grants. */
    void grant(Team.Grant grant);

    boolean revoke(UUID teamId, UUID projectId);

    /** The best role any team the account belongs to grants on the project. */
    Optional<Role> bestGrant(UUID projectId, UUID accountId);

    /** Every (member, team, role) a team grants on the project -- the members list shows them. */
    List<ProjectGrant> grantsOnProject(UUID projectId);

    record ProjectGrant(UUID accountId, UUID teamId, String teamName, Role role) {
    }
}
