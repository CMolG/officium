package com.javadaba.contexts.officium.domain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;

/**
 * Who works a card in each status (card://JAVA-1591): the card's own workflow answers for its phase when it names an
 * eligible role there, and the role matrix answers everything else, exactly as it did before a card had a workflow.
 */
public final class CardRoles {

    private CardRoles() {
    }

    /** The workflow's pick for this status, when the card has one and its role is still eligible in that phase. */
    private static Optional<CardWorkflow.Pick> pick(CardWorkflow workflow, RoleMatrix matrix, Category category,
            SpikeSubtype subtype, Status status, Collection<Signal> signals) {
        if (workflow == null || Phase.of(status).isEmpty()) {
            return Optional.empty();
        }
        Phase phase = Phase.of(status).get();
        List<String> eligible = matrix.eligible(category, subtype, status, signals);
        return workflow.pick(phase).map(pick -> asImplementer(pick, phase, matrix, eligible))
                .filter(pick -> eligible.contains(pick.role()));
    }

    /**
     * In a project that executes by epic, an action pick naming a role the implementer retired is the implementer's,
     * with the pick's mods (card://JAVA-1875): the workflow keeps saying how the card is built, not who builds it.
     */
    static CardWorkflow.Pick asImplementer(CardWorkflow.Pick pick, Phase phase, RoleMatrix matrix,
            List<String> eligible) {
        boolean retired = phase == Phase.ACTION && matrix.implementer() != null && !eligible.contains(pick.role())
                && eligible.contains(matrix.implementer());
        return retired ? new CardWorkflow.Pick(matrix.implementer(), pick.mods()) : pick;
    }

    public static List<String> eligible(RoleMatrix matrix, Category category, SpikeSubtype subtype, Status status,
            Collection<Signal> signals, CardWorkflow workflow) {
        return pick(workflow, matrix, category, subtype, status, signals)
                .map(pick -> List.of(pick.role()))
                .orElseGet(() -> matrix.eligible(category, subtype, status, signals));
    }

    /** The card-level model and effort: the picked role's, else the category cell's. */
    public static Optional<RunConfig> runConfig(RoleMatrix matrix, Category category, SpikeSubtype subtype,
            Status status, Collection<Signal> signals, CardWorkflow workflow) {
        return pick(workflow, matrix, category, subtype, status, signals)
                .map(pick -> runConfigs(matrix, category, subtype, status, signals, workflow).get(pick.role()))
                .or(() -> matrix.runConfig(category, subtype, status));
    }

    /** Each eligible role's model and effort; the picked role is the only one, with its cell's override. */
    public static Map<String, RunConfig> runConfigs(RoleMatrix matrix, Category category, SpikeSubtype subtype,
            Status status, Collection<Signal> signals, CardWorkflow workflow) {
        Map<String, RunConfig> byRole = matrix.runConfigs(category, subtype, status, signals);
        return pick(workflow, matrix, category, subtype, status, signals)
                .map(pick -> byRole.containsKey(pick.role())
                        ? Map.of(pick.role(), byRole.get(pick.role()))
                        : Map.<String, RunConfig>of())
                .orElse(byRole);
    }

    /**
     * Each eligible role's mods: the picked role's own mods on top of its required ones, else the matrix's. Empty for a
     * role with none. {@code dropped} hears of each mod a role's rules leave out.
     */
    public static Map<String, List<String>> mods(RoleMatrix matrix, ModRules rules, Category category,
            SpikeSubtype subtype, Status status, Collection<Signal> signals, CardWorkflow workflow,
            Consumer<String> dropped) {
        Optional<CardWorkflow.Pick> pick = pick(workflow, matrix, category, subtype, status, signals);
        if (pick.isEmpty()) {
            return matrix.modsByRole(category, subtype, status, signals, rules, dropped);
        }
        List<String> mods = pick.get().mods();
        if (pick.get().role().equals(matrix.implementer())) {
            // The implementer keeps its own mods and the cell's under a workflow; the workflow's come on top.
            java.util.Set<String> all = new java.util.LinkedHashSet<>(ImplementerMatrix.withImplementerMods(matrix,
                    pick.get().role(), matrix.cellMods(category, subtype, status, signals), category, subtype, status,
                    signals));
            all.addAll(mods);
            mods = List.copyOf(all);
        }
        List<String> resolved = rules.resolve(pick.get().role(), mods, dropped);
        return resolved.isEmpty() ? Map.of() : Map.of(pick.get().role(), resolved);
    }
}
