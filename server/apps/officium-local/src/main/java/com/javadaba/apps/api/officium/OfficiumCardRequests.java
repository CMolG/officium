package com.javadaba.apps.api.officium;

import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.domain.Assignee;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.SpikeSubtype;
import com.javadaba.contexts.officium.domain.Status;

import java.util.List;

/**
 * How {@link OfficiumCardResource}'s request shapes become the service's. Split out of it to keep
 * that resource under its size bar (card://JAVA-1415).
 */
final class OfficiumCardRequests {

    private OfficiumCardRequests() {
    }

    static CardService.NewCard toNewCard(OfficiumCardResource.NewCardRequest request) {
        return new CardService.NewCard(request.title(), request.description(), request.actionPlan(),
                request.status() == null ? null : Status.fromWire(request.status()),
                request.priority() == null ? null : Priority.fromWire(request.priority()),
                request.executor() == null ? null : Executor.fromWire(request.executor()),
                request.category() == null ? null : Category.fromWire(request.category()), request.estimate(),
                request.epic(), request.tags(), request.assignees() == null
                        ? null
                        : request.assignees().stream().map(OfficiumCardRequests::toAssignee).toList(),
                request.related(), request.blocks(), request.clientKey(), request.sprintId(),
                request.signals() == null ? List.of() : Signal.fromWire(request.signals()),
                request.subtype() == null ? null : SpikeSubtype.fromWire(request.subtype()));
    }

    static Assignee toAssignee(OfficiumCardResource.AssigneeRequest request) {
        return new Assignee(request.accountId(), request.name());
    }
}
