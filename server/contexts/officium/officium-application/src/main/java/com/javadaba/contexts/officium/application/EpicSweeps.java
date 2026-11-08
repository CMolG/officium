package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardLink;
import com.javadaba.contexts.officium.domain.CardRoles;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.EpicCheckpoints;
import com.javadaba.contexts.officium.domain.EpicChildren;
import com.javadaba.contexts.officium.domain.EpicUnit;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.GoverningWorkflow;
import com.javadaba.contexts.officium.domain.ModRules;
import com.javadaba.contexts.officium.domain.Phase;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.contexts.officium.domain.RunConfig;
import com.javadaba.contexts.officium.domain.RunShuffle;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.CardLinkRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.RoleCatalog;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Epics as units of work (card://JAVA-1874, card://JAVA-1876, epic JAVA-1868): in a project that executes by epic,
 * which unit a ranked card belongs to, and the {@link SweepView} its epic is handed out with; in every project, an
 * epic's checkpoints as the board and {@code cards.get} show them. One read of the project's cards and blocks edges
 * per question, like {@code EpicFollower}'s.
 */
@ApplicationScoped
public class EpicSweeps {

    private static final Logger LOG = Logger.getLogger(EpicSweeps.class.getName());

    /** How many epics a pick passes over (each held by another session) before it answers nothing. */
    static final int MAX_PASSED_EPICS = 64;

    private final CardRepository cards;
    private final CardLinkRepository links;
    private final RoleMatrixService roleMatrices;
    private final RoleCatalog catalog;

    @Inject
    public EpicSweeps(CardRepository cards, CardLinkRepository links, RoleMatrixService roleMatrices,
            RoleCatalog catalog) {
        this.cards = cards;
        this.links = links;
        this.roleMatrices = roleMatrices;
        this.catalog = catalog;
    }

    /** Whether the project executes by epic ({@code epic} mode). */
    public boolean epicMode(UUID projectId) {
        return roleMatrices.executionMode(projectId).epic();
    }

    /** The project's live cards and its blocks edges, read once for one question. */
    record Snapshot(List<Card> cards, List<CardLink> edges) {

        Optional<Card> card(UUID id) {
            return cards.stream().filter(card -> card.id().equals(id)).findFirst();
        }

        Set<UUID> childrenOf(Card epic) {
            Set<UUID> ids = new HashSet<>();
            EpicChildren.byEpic(cards).getOrDefault(epic.key(), List.of()).forEach(child -> ids.add(child.id()));
            return ids;
        }
    }

    Snapshot snapshot(UUID projectId) {
        return new Snapshot(cards.findAllByProject(projectId).stream().filter(card -> !card.deleted()).toList(),
                links.findAllBlocksEdges(projectId));
    }

    /**
     * The next unit in epic mode: {@code ranked} answers the best card outside the passed set, as {@code cards.next}
     * ranks them. A card of an open epic answers its epic, in the phase its checkpoints give it; an epic another session
     * holds ({@code working}) passes with all its cards. An action sweep with no {@code next}, whose open work all
     * waits on a person, passes with the cards it is worked in (card://JAVA-2001): handed out, its session had nothing
     * to build, and the next pick handed it out again. Its Refine cards, each its own unit, are still handed out.
     * {@code view} reads a card by key under the caller's access.
     */
    Optional<WorkPick> pick(UUID projectId, Set<UUID> working, Function<Set<UUID>, Optional<CardView>> ranked,
            Function<String, CardView> view) {
        Snapshot snapshot = snapshot(projectId);
        Set<UUID> passed = new HashSet<>(working);
        snapshot.cards().stream().filter(card -> card.category() == Category.EPIC && working.contains(card.id()))
                .forEach(epic -> passed.addAll(snapshot.childrenOf(epic)));
        for (int epics = 0; epics < MAX_PASSED_EPICS; epics++) {
            Optional<CardView> next = ranked.apply(passed);
            if (next.isEmpty()) {
                return Optional.empty();
            }
            Optional<EpicUnit> unit = snapshot.card(next.get().id())
                    .flatMap(card -> EpicUnit.of(card, snapshot.cards(), snapshot.edges()));
            if (unit.isEmpty()) {
                return Optional.of(WorkPick.alone(next.get()));
            }
            if (passed.contains(unit.get().epic().id())) {
                passed.addAll(snapshot.childrenOf(unit.get().epic()));
            } else if (unit.get().phase() == Phase.ACTION && EpicCheckpoints.next(unit.get().checkpoints()).isEmpty()) {
                passed.addAll(sweptCards(unit.get()));
            } else {
                return Optional.of(new WorkPick(view.apply(unit.get().epic().key()), sweep(projectId, unit.get())));
            }
        }
        return Optional.empty();
    }

    /** The cards an epic's unit is worked in, as {@link EpicUnit#of} groups them: agent cards in action or review. */
    private static Set<UUID> sweptCards(EpicUnit unit) {
        Set<UUID> ids = new HashSet<>();
        unit.checkpoints().stream().map(EpicCheckpoints.Checkpoint::card)
                .filter(card -> card.executor() == Executor.AI && card.category() != Category.SPIKE)
                .filter(card -> Phase.of(card.status()).filter(p -> p == Phase.ACTION || p == Phase.REVIEW).isPresent())
                .forEach(card -> ids.add(card.id()));
        return ids;
    }

    /**
     * {@code card} as the unit a slot holding it works (card://JAVA-1786's {@code ?card=}): an epic in its phase, a card
     * of an open epic as that epic, and anything else alone. Card mode answers it alone.
     */
    WorkPick unitOf(UUID projectId, CardView card, Function<String, CardView> view) {
        if (!epicMode(projectId)) {
            return WorkPick.alone(card);
        }
        Snapshot snapshot = snapshot(projectId);
        Optional<Card> stored = snapshot.card(card.id());
        Optional<EpicUnit> unit = stored.flatMap(found -> found.category() == Category.EPIC
                ? EpicUnit.ofEpic(found, snapshot.cards(), snapshot.edges())
                : EpicUnit.of(found, snapshot.cards(), snapshot.edges()));
        return unit.map(u -> new WorkPick(u.epic().id().equals(card.id()) ? card : view.apply(u.epic().key()),
                sweep(projectId, u))).orElse(WorkPick.alone(card));
    }

    /**
     * In epic mode a sweep left mid-epic resumes as its epic, listed once (card://JAVA-1874). An epic with any card a
     * live session works ({@code working}) is that session's, as {@link #pick} reads it (card://JAVA-2004): resumable
     * once listed JAVA-1598 for the very slot whose stale session kept its checkpoint lit, while the pick passed it.
     */
    List<AgentWorkService.ResumableView> asUnits(UUID projectId, List<AgentWorkService.ResumableView> left,
            Set<UUID> working, Function<String, CardView> view) {
        Snapshot snapshot = snapshot(projectId);
        Map<UUID, AgentWorkService.ResumableView> units = new LinkedHashMap<>();
        for (AgentWorkService.ResumableView resumable : left) {
            Optional<Card> epic = snapshot.card(resumable.card().id()).flatMap(card -> card.category() == Category.EPIC
                    ? Optional.of(card)
                    : EpicUnit.of(card, snapshot.cards(), snapshot.edges()).map(EpicUnit::epic));
            if (epic.isPresent() && (working.contains(epic.get().id())
                    || snapshot.childrenOf(epic.get()).stream().anyMatch(working::contains))) {
                continue;
            }
            CardView unit = epic.filter(found -> !found.id().equals(resumable.card().id()))
                    .map(found -> view.apply(found.key())).orElse(resumable.card());
            units.putIfAbsent(unit.id(), new AgentWorkService.ResumableView(unit, resumable.lastRun()));
        }
        return List.copyOf(units.values());
    }

    /** An epic's checkpoints with their action mods, null for any other card; served in every mode. */
    public List<CheckpointView> checkpoints(UUID projectId, CardView card) {
        if (!Category.EPIC.wire().equals(card.category())) {
            return null;
        }
        Snapshot snapshot = snapshot(projectId);
        return views(roleMatrices.effective(projectId), EpicCheckpoints.of(card.key(), snapshot.cards(),
                snapshot.edges()), GoverningWorkflow.over(snapshot.cards()), epicMode(projectId));
    }

    SweepView sweep(UUID projectId, EpicUnit unit) {
        RoleMatrix matrix = roleMatrices.effective(projectId);
        RunShuffle shuffle = roleMatrices.shuffle(projectId, matrix);
        Card epic = unit.epic();
        Status in = unit.phase().status();
        List<String> eligible = CardRoles.eligible(matrix, Category.EPIC, null, in, epic.signals(), epic.workflow());
        Map<String, String> run = CardRoles.runConfig(matrix, Category.EPIC, null, in, epic.signals(),
                epic.workflow()).map(cell -> shuffle.apply(epic.id(), Category.EPIC, null, in, cell))
                .map(RunConfig::toWire).orElse(null);
        Map<String, Map<String, String>> runs = CardView.runConfigsWithToolTiers(shuffle.applyAll(epic.id(),
                Category.EPIC, null, in, CardRoles.runConfigs(matrix, Category.EPIC, null, in, epic.signals(),
                        epic.workflow())),
                catalog.toolTiers());
        Map<String, List<String>> mods = CardRoles.mods(matrix, catalog.rules(), Category.EPIC, null, in,
                epic.signals(), epic.workflow(), warning(epic));
        String next = unit.phase() == Phase.ACTION
                ? EpicCheckpoints.next(unit.checkpoints()).map(c -> c.card().key()).orElse(null)
                : null;
        return new SweepView(unit.phase().wire(), eligible, run, runs, mods, views(matrix, unit.checkpoints(),
                GoverningWorkflow.over(List.of(epic)), true),
                EpicCheckpoints.progress(unit.checkpoints()), next);
    }

    /**
     * {@code governing} reads each checkpoint's workflow: its epic's part, once the epic's is written (JAVA-1885).
     * {@code epicMode}: a checkpoint is {@code blocked} by what holds it back from the sweep (card://JAVA-2001).
     */
    private List<CheckpointView> views(RoleMatrix matrix, List<EpicCheckpoints.Checkpoint> checkpoints,
            Function<Card, GoverningWorkflow> governing, boolean epicMode) {
        ModRules rules = catalog.rules();
        return checkpoints.stream().map(checkpoint -> {
            Card card = checkpoint.card();
            Set<String> mods = new LinkedHashSet<>();
            CardRoles.mods(matrix, rules, card.category(), card.subtype(), Status.DOING, card.signals(),
                    governing.apply(card).workflow(), warning(card)).values().forEach(mods::addAll);
            return CheckpointView.of(checkpoint, List.copyOf(mods), epicMode);
        }).toList();
    }

    private static java.util.function.Consumer<String> warning(Card card) {
        return message -> LOG.log(Level.WARNING, "{0} (card {1})", new Object[]{message, card.key()});
    }
}
