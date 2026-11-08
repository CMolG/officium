package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Phase;
import com.javadaba.contexts.officium.domain.RunMatrix;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ToolTier;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * What a loop slot's supervisor asks before it launches a session (card://JAVA-1587, JAVA-1786, JAVA-1890) and before
 * a session may end (card://JAVA-2004): the run the next session starts on, and whether the unit a session holds still
 * has work for it. {@code GET .../autoloop/next-run} and {@code GET .../autoloop/unit} answer through here, and so does
 * the flow simulation, so the lab runs the code production runs.
 *
 * <p>card://JAVA-2004: a slot asks for its next run only when it has no session, so whatever its machine still shows
 * live on the board is stale: a session that ended without putting its card down, kept lit by the next session's
 * heartbeats, which renew every session of the machine. On 2026-11-03 the pick passed JAVA-1598 as another session's
 * while {@code cards.resumable} handed it back to the same slot, which started on the pick's run and relaunched ($2.90
 * of Opus spent on reading the board). Those sessions end here first, and the slot's own unfinished unit comes before
 * the pick, as its worker resumes before it picks.
 */
@ApplicationScoped
public class NextRunService {

    private final AgentWorkService agentWork;
    private final RoleMatrixService roleMatrices;

    @Inject
    public NextRunService(AgentWorkService agentWork, RoleMatrixService roleMatrices) {
        this.agentWork = agentWork;
        this.roleMatrices = roleMatrices;
    }

    /**
     * {@code card}: the claim the slot holds, whose unit's run comes back whatever else is true. {@code machine}: the
     * slot's own; without it, the pick alone answers, as before JAVA-2004. {@code exclude}: the units other slots hold.
     * {@code phases}: the loop's {@code --phases}, which bound the pick only: a slot finishes its own unit in any phase.
     */
    public NextRun next(UUID accountId, UUID projectId, String machine, String card, List<String> exclude,
            Set<Phase> phases) {
        boolean mine = machine != null && !machine.isBlank();
        if (mine) {
            endStale(accountId, projectId, machine.strip());
        }
        if (card != null && !card.isBlank()) {
            return runOf(projectId, agentWork.unit(accountId, projectId, card.strip()));
        }
        if (mine) {
            Optional<WorkPick> unfinished = agentWork.resumable(accountId, projectId, machine.strip()).stream()
                    .map(left -> agentWork.unit(accountId, projectId, left.card().key()))
                    .filter(unit -> workable(unit) && !exclude.contains(unit.card().key())).findFirst();
            if (unfinished.isPresent()) {
                return runOf(projectId, unfinished.get());
            }
        }
        return PhasedPick.pick(agentWork, accountId, projectId, false, exclude, phases)
                .map(pick -> runOf(projectId, pick)).orElse(NextRun.NONE);
    }

    /**
     * Whether a unit has anything for a session now: an epic with no sweep, or an action sweep that names nothing to
     * build, has not (its session could only release it: a launch spent on nothing).
     */
    static boolean workable(WorkPick unit) {
        if (unit.sweep() == null) {
            return !Category.EPIC.wire().equals(unit.card().category());
        }
        return !Phase.ACTION.wire().equals(unit.sweep().phase()) || unit.sweep().next() != null;
    }

    /** Ends every session {@code machine} still shows live on the project's board; returns their keys. */
    public List<String> endStale(UUID accountId, UUID projectId, String machine) {
        List<String> ended = new ArrayList<>();
        for (AgentWorkView live : agentWork.active(accountId, projectId)) {
            ActorJson actor = live.actor();
            if (accountId.equals(actor.accountId()) && machine.equalsIgnoreCase(actor.machine())) {
                agentWork.setActivelyWorking(accountId, projectId, live.cardId().toString(), false,
                        Actor.agent(accountId, actor.agentName(), actor.machine()));
                ended.add(live.cardKey());
            }
        }
        return ended;
    }

    /**
     * The done gate (card://JAVA-2004): whether the unit {@code card} is in still has work a session can do now, which
     * the pick would hand straight back to the next session: an action sweep that names a checkpoint to build, or a
     * card still In progress that nothing holds back. On 2026-11-03 two sessions in a row committed a slice of
     * JAVA-1601 and ended with {@code done}; each next one paid a start and a context read to go on. A review ends
     * with its verdicts and moves its cards on its own, so nothing here holds it.
     */
    public UnitState unitState(UUID accountId, UUID projectId, String card) {
        WorkPick unit = agentWork.unit(accountId, projectId, card.strip());
        CardView head = unit.card();
        if (unit.sweep() != null) {
            String phase = unit.sweep().phase();
            // A sweep that reaches Review is another session's to review (never the one that built it), so the
            // session that built it ends there.
            String next = unit.sweep().next();
            return next == null
                    ? new UnitState(head.key(), phase, false, null, "its sweep names no checkpoint to build now")
                    : new UnitState(head.key(), phase, true, next, next + " is the checkpoint the sweep builds now");
        }
        // An epic with no sweep has nothing for a session now: In progress is its column, not unfinished work.
        boolean open = !Category.EPIC.wire().equals(head.category()) && Status.DOING.wire().equals(head.status())
                && !head.blocked();
        return new UnitState(head.key(), head.phase(), open, null, open
                ? head.key() + " is still In progress and nothing holds it back"
                : head.key() + " has left the phase a session works it in, or waits on someone");
    }

    /**
     * An epic handed out as one unit starts on its sweep's run, the same for every checkpoint (card://JAVA-1874). A
     * Refine card with no workflow is first a workflow session, on the matrix's workflow cell (JAVA-1591), not on its
     * role's run (card://JAVA-1808: answering the role's run cost a relaunch on every such card).
     */
    NextRun runOf(UUID projectId, WorkPick pick) {
        CardView card = pick.card();
        if (pick.sweep() != null) {
            Map<String, String> sweep = pick.sweep().runConfig() == null ? Map.of() : pick.sweep().runConfig();
            return new NextRun(card.key(), sweep.get("model"), sweep.get("effort"),
                    NextRun.widest(pick.sweep().eligibleRoles(), pick.sweep().runConfigs()));
        }
        NextRun run = NextRun.of(card);
        if (card.workflow() != null || !Phase.REFINE.wire().equals(card.phase())) {
            return run;
        }
        return roleMatrices.effective(projectId).runs().resolve(RunMatrix.WORKFLOW, Phase.REFINE, null)
                .map(cell -> new NextRun(run.key(), cell.model(), cell.effort().wire(), run.toolTier())).orElse(run);
    }

    /** The next card's key and the run its cell asks for; all null when nothing is eligible. */
    public record NextRun(String key, String model, String effort, String toolTier) {

        static final NextRun NONE = new NextRun(null, null, null, null);

        static NextRun of(CardView card) {
            Map<String, String> run = card.runConfig() == null ? Map.of() : card.runConfig();
            return new NextRun(card.key(), run.get("model"), run.get("effort"),
                    widest(card.eligibleRoles(), card.runConfigs()));
        }

        /**
         * The widest tier among the eligible roles that declare one (JAVA-1445): the session the run starts is held to
         * the tools all of them may use. Null when none of them declares a tier.
         */
        static String widest(List<String> eligibleRoles, Map<String, Map<String, String>> runConfigs) {
            return eligibleRoles.stream().map(role -> runConfigs.getOrDefault(role, Map.of()).get("toolTier"))
                    .filter(Objects::nonNull).map(ToolTier::fromWire).max(Comparator.naturalOrder())
                    .map(ToolTier::wire).orElse(null);
        }
    }

    /**
     * {@code open}: whether the pick would hand {@code key}'s unit straight back. {@code next}: the checkpoint its sweep
     * builds now, when it names one. {@code reason}: the line a refused {@code done} prints.
     */
    public record UnitState(String key, String phase, boolean open, String next, String reason) {
    }
}
