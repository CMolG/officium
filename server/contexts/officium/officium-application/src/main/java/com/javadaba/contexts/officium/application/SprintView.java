package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Sprint;
import com.javadaba.contexts.officium.domain.ports.SprintRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Wire shape of {@link Sprint} (contract §8.2), with what it holds counted in. */
public record SprintView(UUID id, UUID projectId, String name, String goal, String state, LocalDate startDate,
        LocalDate endDate, Instant startedAt, Instant closedAt, int order, int version, Instant createdAt,
        Instant updatedAt, int cardCount, int openCardCount, double estimate) {

    public static SprintView of(Sprint sprint, SprintRepository.Counts counts) {
        return new SprintView(sprint.id(), sprint.projectId(), sprint.name(), sprint.goal(), sprint.state().wire(),
                sprint.startDate(), sprint.endDate(), sprint.startedAt(), sprint.closedAt(), sprint.order(),
                sprint.version(), sprint.createdAt(), sprint.updatedAt(), counts.cardCount(), counts.openCardCount(),
                counts.estimate());
    }
}
