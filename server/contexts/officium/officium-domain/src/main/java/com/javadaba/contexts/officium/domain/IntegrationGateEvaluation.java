package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** The pure evaluation of a project's integration gate (JAVA-1820): the facts in, the reasons it is open out. */
public final class IntegrationGateEvaluation {

    /** Cards a reason names at most: enough to see what waits, not a list to scroll. */
    public static final int NAMED = 5;

    private IntegrationGateEvaluation() {
    }

    /** An open agent card of the active sprint waiting on cards in Deploy. */
    public record Held(String key, Priority priority, List<String> blockers) {
    }

    /** What the database says: the held cards, the open Deploy cards, and whether {@code cards.next} has a card. */
    public record Facts(List<Held> held, List<String> deployKeys, boolean nextAvailable) {
    }

    public record Reason(String rule, String message, List<String> cards) {
    }

    public static List<Reason> evaluate(IntegrationGate.Rules rules, Facts facts) {
        List<Reason> reasons = new ArrayList<>();
        if (rules.heldByDeploy().enabled()) {
            held(rules.heldByDeploy(), facts).ifPresent(reasons::add);
        }
        int waiting = facts.deployKeys().size();
        if (rules.deployQueue().enabled() && waiting >= rules.deployQueue().max()) {
            reasons.add(new Reason("deployQueue", waiting + " cards wait in Deploy, and the limit is "
                    + rules.deployQueue().max() + ": the control branch needs merging.", named(facts.deployKeys())));
        }
        if (rules.nothingElse().enabled() && !facts.nextAvailable() && waiting > 0) {
            reasons.add(new Reason("nothingElse", "Nothing else can be worked while " + waiting
                    + (waiting == 1 ? " card waits" : " cards wait") + " in Deploy: the control branch needs merging.",
                    named(facts.deployKeys())));
        }
        return reasons;
    }

    private static Optional<Reason> held(IntegrationGate.HeldByDeploy rule, Facts facts) {
        List<Held> opening = facts.held().stream().filter(h -> h.priority().rank() <= rule.minPriority().rank())
                .toList();
        if (opening.isEmpty()) {
            return Optional.empty();
        }
        Held first = opening.get(0);
        String more = opening.size() == 1
                ? ""
                : " " + (opening.size() - 1) + " more held card" + (opening.size() > 2 ? "s wait" : " waits")
                        + " the same way.";
        String message = first.key() + " waits on " + String.join(", ", first.blockers())
                + ", which is in Deploy: it needs the control branch merged." + more;
        return Optional.of(new Reason("heldByDeploy", message, opening.stream().map(Held::key).toList()));
    }

    private static List<String> named(List<String> keys) {
        return keys.size() <= NAMED ? keys : keys.subList(0, NAMED);
    }
}
