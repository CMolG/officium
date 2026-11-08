package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.CardRoles;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardWorkflow;
import com.javadaba.contexts.officium.domain.GoverningWorkflow;
import com.javadaba.contexts.officium.domain.PhaseRun;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.contexts.officium.domain.RunConfig;
import com.javadaba.contexts.officium.domain.RunShuffle;
import com.javadaba.contexts.officium.domain.WorkProfile;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.PhaseRunRepository;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Keeps who ran the phase a card leaves (card://JAVA-1527), out of {@code CardService} at its size ceiling: the
 * project's active profile, the role the mover named when it is one of the phase's eligible roles, and that role's
 * cell (the category cell's own when it named none: what the phase is configured with, not a guess at a role).
 * Written once the move committed, like the review outcome.
 */
final class PhaseRunRecorder {

    private final PhaseRunRepository runs;
    private final RoleMatrixService roleMatrices;
    private final CardRepository cards;

    PhaseRunRecorder(PhaseRunRepository runs, RoleMatrixService roleMatrices, CardRepository cards) {
        this.runs = runs;
        this.roleMatrices = roleMatrices;
        this.cards = cards;
    }

    void record(Card before, Card moved, String role, Actor actor, Instant now) {
        if (before.status() == moved.status()) {
            return;
        }
        RoleMatrix matrix = roleMatrices.effective(before.projectId());
        RunShuffle shuffle = roleMatrices.shuffle(before.projectId(), matrix);
        CardWorkflow workflow = GoverningWorkflow.of(before, cards).workflow();
        Map<String, RunConfig> cells = CardRoles.runConfigs(matrix, before.category(), before.subtype(),
                before.status(), before.signals(), workflow);
        String ran = role != null && cells.containsKey(role) ? role : null;
        // The shuffle's draw is what the phase ran on (card://JAVA-1858), so Contributions compares the drawn pairs.
        RunConfig cell = shuffle.apply(before.id(), before.category(), before.subtype(), before.status(), ran != null
                ? cells.get(ran)
                : CardRoles.runConfig(matrix, before.category(), before.subtype(), before.status(),
                        before.signals(), workflow).orElse(null));
        runs.insert(new PhaseRun(UUID.randomUUID(), before.projectId(), before.id(), now, actor.kind(),
                before.status(), moved.status(), before.category(),
                roleMatrices.activeProfile(before.projectId()).map(WorkProfile::id).orElse(null), ran,
                cell == null ? null : cell.model(), cell == null ? null : cell.effort().wire()));
    }
}
