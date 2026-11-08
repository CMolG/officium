package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * The work profiles every account has (card://JAVA-1524). Claude Standard is Officium's defaults as they are: Opus
 * plans, reviews and analyses, Sonnet builds and deploys. Claude Eco is the cheapest distribution the owner set:
 * it plans on Opus 5.5 at high (card://JAVA-2091, owner, 2026-11-07), and every other phase runs on Sonnet 5.5,
 * saving by effort only: it analyses and reviews at high, builds at medium and deploys at low. The cells whose
 * building is research or security (spike, its ux-ui subtype, security) build at high. Eco built and deployed on
 * Haiku 5.5 until card://JAVA-1884 (owner, 2026-10-27): in epic mode one implementer session sweeps a whole epic, and
 * Haiku gave up after a few commits, so the epic took a session per checkpoint. Eco planned on Sonnet 5.5 at xhigh
 * until JAVA-2091.
 * Standard also mounts the rule-enforcer mod on every Review cell (card://JAVA-1569), so a review walks the rules.
 */
public final class WorkProfiles {

    public static final String STANDARD = "claude-standard";
    public static final String ECO = "claude-eco";

    static final String SONNET = "claude-sonnet-5-5";
    static final String OPUS = "claude-opus-5-5";
    static final String RULE_ENFORCER = "rule-enforcer";

    static final Set<String> CRITICAL_ACTION = Set.of(Category.SPIKE.wire(), RoleMatrix.SPIKE_UX_UI,
            Category.SECURITY.wire());

    private WorkProfiles() {
    }

    /** The built-ins, Standard first, as an account that never edited them sees them. */
    public static List<WorkProfile> builtins() {
        return List.of(
                new WorkProfile(STANDARD, "Claude Standard", true, standard(), 0, Instant.EPOCH),
                new WorkProfile(ECO, "Claude Eco", true, eco(), 0, Instant.EPOCH));
    }

    public static Optional<WorkProfile> builtin(String id) {
        return builtins().stream().filter(profile -> profile.id().equals(id)).findFirst();
    }

    public static boolean isBuiltin(String id) {
        return builtin(id).isPresent();
    }

    /** Whether a build cell of {@code profileId} may be asked to run {@code model}: Eco builds on Sonnet only
     *  (JAVA-1884). The tally asks only build cells, so Eco's Opus planning (JAVA-2091) does not enter it. */
    public static boolean allows(String profileId, String model) {
        return !ECO.equals(profileId) || SONNET.equals(model);
    }

    /** Standard's overlay: Officium's defaults, with the rule-enforcer mod on every row's Review cell. */
    static RoleMatrix standard() {
        Map<String, Map<Phase, List<String>>> cells = new LinkedHashMap<>();
        for (String row : RoleMatrix.rowKeys()) {
            Map<Phase, List<String>> phases = new EnumMap<>(Phase.class);
            phases.put(Phase.REVIEW, List.of(RULE_ENFORCER));
            cells.put(row, phases);
        }
        return new RoleMatrix(Map.of(), Map.of(), RunMatrix.empty(), new ModMatrix(cells));
    }

    /** Eco's overlay: a run cell for every row and phase, roles left as Officium's defaults give them. */
    static RoleMatrix eco() {
        Map<String, Map<Phase, RunCell>> cells = new LinkedHashMap<>();
        for (String row : RoleMatrix.rowKeys()) {
            Map<Phase, RunCell> phases = new EnumMap<>(Phase.class);
            phases.put(Phase.REFINE, cell(OPUS, Effort.HIGH));
            phases.put(Phase.ACTION, cell(SONNET, CRITICAL_ACTION.contains(row) ? Effort.HIGH : Effort.MEDIUM));
            phases.put(Phase.READY, cell(SONNET, Effort.HIGH));
            phases.put(Phase.REVIEW, cell(SONNET, Effort.HIGH));
            phases.put(Phase.DEPLOY, cell(SONNET, Effort.LOW));
            cells.put(row, phases);
        }
        return new RoleMatrix(Map.of(), Map.of(), new RunMatrix(cells));
    }

    private static RunCell cell(String model, Effort effort) {
        return RunCell.of(new RunConfig(model, effort));
    }
}
