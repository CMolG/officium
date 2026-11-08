package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

/**
 * Shuffle mode (card://JAVA-1858): with it on, a card's action and deploy phases run on a model and effort drawn
 * near the cell its profile configures, so outcomes can be compared per model and effort. Nearby is the configured
 * model's family, one down and one up, never above the profile's ceiling (the highest family its action and deploy
 * cells use), at low to xhigh effort. A profile whose action and deploy cells use one family only never leaves it:
 * Eco builds and deploys on Sonnet alone (card://JAVA-1884), so its draws vary the effort and nothing else, though it
 * plans on Opus (card://JAVA-2091): planning is not drawn, so it does not raise the ceiling. Refine, ready and review keep their cell, so
 * the review that judges the work stays the same judge; research and security cells keep theirs too.
 *
 * <p>The draw is a hash of the card and the phase, not a random number (invariant 8): every read of the same card in
 * the same phase gets the same pair, so a worker is never relaunched because two reads disagreed.
 */
public final class RunShuffle {

    public static final RunShuffle OFF = new RunShuffle(-1, -1);

    static final List<String> FAMILIES = List.of("haiku", "sonnet", "opus");
    static final List<Effort> EFFORTS = List.of(Effort.LOW, Effort.MEDIUM, Effort.HIGH, Effort.XHIGH);
    private static final Set<Phase> SHUFFLED = Set.of(Phase.ACTION, Phase.DEPLOY);

    /** The indexes in {@link #FAMILIES} of the lowest and the highest family the profile uses; -1 when off. */
    private final int floor;
    private final int ceiling;

    private RunShuffle(int floor, int ceiling) {
        this.floor = floor;
        this.ceiling = ceiling;
    }

    /** Shuffle over {@code matrix}, its floor and ceiling read from the action and deploy cells, role overrides
     *  included: the phases it draws for. */
    public static RunShuffle over(RoleMatrix matrix) {
        TreeSet<Integer> used = new TreeSet<>();
        for (Map.Entry<String, Map<Phase, RunCell>> row : matrix.runs().cells().entrySet()) {
            if (RunMatrix.WORKFLOW.equals(row.getKey())) {
                continue;
            }
            row.getValue().forEach((phase, cell) -> {
                if (SHUFFLED.contains(phase)) {
                    used.add(family(cell.config().model()));
                    cell.roles().values().forEach(role -> used.add(family(role.model())));
                }
            });
        }
        used.remove(-1);
        return used.isEmpty() ? OFF : new RunShuffle(used.first(), used.last());
    }

    public boolean on() {
        return ceiling >= 0;
    }

    /** What the card runs with in this status: the draw where shuffle applies, else {@code configured} itself. */
    public RunConfig apply(UUID cardId, Category category, SpikeSubtype subtype, Status status,
            RunConfig configured) {
        Phase phase = Phase.of(status).orElse(null);
        if (!on() || configured == null || category == null || phase == null || !SHUFFLED.contains(phase)
                || WorkProfiles.CRITICAL_ACTION.contains(RoleMatrix.rowFor(category, subtype))) {
            return configured;
        }
        List<RunConfig> pool = pool(configured);
        return pool.isEmpty() ? configured : pool.get(Math.floorMod(draw(cardId, phase), pool.size()));
    }

    /** Each role's run through {@link #apply}: the same draw for the card's phase, whatever the role. */
    public Map<String, RunConfig> applyAll(UUID cardId, Category category, SpikeSubtype subtype, Status status,
            Map<String, RunConfig> byRole) {
        if (!on()) {
            return byRole;
        }
        Map<String, RunConfig> drawn = new LinkedHashMap<>();
        byRole.forEach((role, run) -> drawn.put(role, apply(cardId, category, subtype, status, run)));
        return drawn;
    }

    /** The configured family, one down and one up, at most the ceiling (only it, for a one-family profile), each at
     *  every shuffled effort. */
    List<RunConfig> pool(RunConfig configured) {
        int family = family(configured.model());
        List<RunConfig> pool = new ArrayList<>();
        if (family < 0) {
            return pool;
        }
        int lowest = floor == ceiling ? floor : 0;
        for (int near = Math.max(lowest, family - 1); near <= Math.min(ceiling, family + 1); near++) {
            String model = configured.model().replace(FAMILIES.get(family), FAMILIES.get(near));
            EFFORTS.forEach(effort -> pool.add(new RunConfig(model, effort)));
        }
        return pool;
    }

    /** The index of the model's family in {@link #FAMILIES}, or -1 for a model outside them. */
    static int family(String model) {
        for (int i = 0; i < FAMILIES.size(); i++) {
            if (model.contains("-" + FAMILIES.get(i) + "-") || model.endsWith("-" + FAMILIES.get(i))) {
                return i;
            }
        }
        return -1;
    }

    /** SplitMix64's finalizer over the card and the phase: spread evenly, and the same for the same pair. */
    static int draw(UUID cardId, Phase phase) {
        long z = cardId.getMostSignificantBits() ^ Long.rotateLeft(cardId.getLeastSignificantBits(), 17)
                ^ (phase.ordinal() + 1) * 0x9E3779B97F4A7C15L;
        z = (z ^ (z >>> 30)) * 0xBF58476D1CE4E5B9L;
        z = (z ^ (z >>> 27)) * 0x94D049BB133111EBL;
        return (int) ((z ^ (z >>> 31)) >>> 33);
    }
}
