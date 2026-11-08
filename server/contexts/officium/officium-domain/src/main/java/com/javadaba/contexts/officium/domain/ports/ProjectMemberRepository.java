package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.ProjectMember;
import com.javadaba.contexts.officium.domain.Role;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectMemberRepository {

    ProjectMember insert(ProjectMember member);

    Optional<ProjectMember> find(UUID projectId, UUID accountId);

    List<ProjectMember> listByProject(UUID projectId);

    void updateRole(UUID projectId, UUID accountId, Role role);

    void remove(UUID projectId, UUID accountId);
}
