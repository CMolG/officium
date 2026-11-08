package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Assignee;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.SpikeSubtype;
import java.util.List;

/**
 * The card an edit makes of the current one (JAVA-1592). Kept apart from {@code CardService}, which is over its size
 * ceiling. What the edit does not name stays as it is, the workflow and the rejection included: a card rebuilt
 * without them would lose both on every save.
 */
final class CardEdits {

    private CardEdits() {
    }

    static Card applied(Card current, CardService.CardEdit edit, List<Assignee> assignees) {
        return new Card(current.id(), current.projectId(), current.key(), current.number(),
                edit.title() != null ? edit.title().strip() : current.title(),
                edit.description() != null ? edit.description() : current.description(),
                edit.actionPlan() != null ? edit.actionPlan() : current.actionPlan(),
                current.status(), current.runState(),
                edit.priority() != null ? edit.priority() : current.priority(), current.executor(),
                edit.category() == null
                        ? current.category()
                        : edit.category().isBlank() ? null : Category.fromWire(edit.category()),
                current.order(), edit.estimate() != null ? edit.estimate() : current.estimate(),
                edit.epic() != null ? edit.epic() : current.epic(),
                edit.tags() != null ? edit.tags() : current.tags(), assignees, current.version(),
                current.createdAt(), current.updatedAt(), current.createdBy(), current.updatedBy(), null,
                current.clientKey(), current.humanEdit(), current.sprintId(), current.rank(),
                edit.signals() != null ? Signal.fromWire(edit.signals()) : current.signals(),
                edit.subtype() != null ? SpikeSubtype.fromWire(edit.subtype()) : current.subtype(),
                current.rejection(), current.workflow());
    }
}
