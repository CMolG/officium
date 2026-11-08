package com.javadaba.contexts.officium.application;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.javadaba.contexts.officium.domain.DefinitionOfDone;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.Role;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProjectView(UUID id, UUID folderId, String name, String keyPrefix, String icon, String iconColor,
        String role, Instant archivedAt, int version, Instant createdAt, Instant updatedAt,
        List<String> formLanguages, List<String> definitionOfDone, int definitionOfDoneTokenQuota,
        @JsonProperty("protected") boolean isProtected) {

    public static ProjectView of(Project project, Role callerRole) {
        return new ProjectView(project.id(), project.folderId(), project.name(), project.keyPrefix(), project.icon(),
                project.iconColor().wire(), callerRole.wire(), project.archivedAt(), project.version(),
                project.createdAt(), project.updatedAt(), project.formLanguages(), project.definitionOfDone(),
                DefinitionOfDone.TOKEN_QUOTA, project.isProtected());
    }
}
