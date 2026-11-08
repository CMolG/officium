package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.EpicUnit;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Phase;
import com.javadaba.contexts.officium.domain.Status;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * {@link AgentWorkService#pick} for a loop restricted to some phases ({@code /autoloop --phases}, card://JAVA-1890):
 * the next unit in one of them. Without it the server handed a review-only loop a Refine card, which the session
 * could only release: a launch spent on nothing, the flow simulation's finding. A unit in another phase is passed by
 * leaving out its cards of that phase, never its epic, since an epic left out passes with ALL its cards and would
 * hide the ones in a phase the loop does work.
 */
public final class PhasedPick {

    /** How many units of other phases a pick passes over before it answers nothing. */
    static final int MAX_PASSED = 64;

    private PhasedPick() {
    }

    /** The loop's phases by the names {@code --phases} takes ({@code todo} is the action phase); empty is all. */
    public static Set<Phase> parse(List<String> names) {
        Set<Phase> phases = EnumSet.noneOf(Phase.class);
        names.stream().map(String::strip).filter(name -> !name.isEmpty())
                .map(name -> "todo".equals(name) ? Phase.ACTION : Phase.fromWire(name)).forEach(phases::add);
        if (phases.contains(Phase.DEPLOY)) {
            throw OfficiumException.badRequest("invalid_phase", "The loop never works Deploy: it waits on a merge");
        }
        return phases;
    }

    public static Optional<WorkPick> pick(AgentWorkService agentWork, UUID accountId, UUID projectId,
            boolean beyondSprint, List<String> excludedKeys, Set<Phase> phases) {
        List<String> passed = new ArrayList<>(excludedKeys);
        for (int asks = 0; asks <= MAX_PASSED; asks++) {
            Optional<WorkPick> pick = agentWork.pick(accountId, projectId, beyondSprint, passed);
            if (pick.isEmpty() || phases.isEmpty() || phases.contains(phaseOf(pick.get()))) {
                return pick;
            }
            passed.addAll(cardsOfTheUnit(pick.get()));
        }
        return Optional.empty();
    }

    /** The phase a unit is worked in: its sweep's, or its card's. */
    static Phase phaseOf(WorkPick pick) {
        return pick.sweep() != null
                ? Phase.fromWire(pick.sweep().phase())
                : Phase.of(Status.fromWire(pick.card().status())).orElseThrow();
    }

    /**
     * What passing a unit leaves out: its card, or every card that ranks as its epic ({@link EpicUnit}: an {@code ai}
     * checkpoint, no spike, in action or review), so no card of it answers the same epic again. Its Refine cards, its
     * spikes and its Ready cards are units of their own and stay.
     */
    private static List<String> cardsOfTheUnit(WorkPick pick) {
        if (pick.sweep() == null) {
            return List.of(pick.card().key());
        }
        List<String> keys = pick.sweep().checkpoints().stream()
                .filter(c -> Executor.AI.wire().equals(c.executor()) && !Category.SPIKE.wire().equals(c.category()))
                .filter(c -> Phase.of(Status.fromWire(c.status()))
                        .filter(p -> p == Phase.ACTION || p == Phase.REVIEW).isPresent())
                .map(CheckpointView::key).toList();
        return keys.isEmpty() ? List.of(pick.card().key()) : keys;
    }
}
