package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Refine ends with a plan on the card (user request, 2026-10-05, JAVA-915): an {@code ai} card leaves Refine
 * for work only once its action plan says HOW it will be done, so whoever takes it in To do follows a plan a
 * person could read and correct first, instead of writing one as they go.
 *
 * <p>Unlike {@link CategoryContracts}, a person is refused too (the user's decision): an {@code ai} card in To
 * do with no plan is the gap this closes, whoever dragged it there. A {@code human} card is a person's to plan
 * however they like. A routine's runbook is its plan, a hotfix's refine is the express one its entry contract
 * already gates, and an epic plans through its children.
 */
public final class PlanContract {

    private static final Set<Category> EXEMPT = Set.of(Category.ROUTINE, Category.HOTFIX, Category.EPIC);
    private static final Set<Status> WORK = Set.of(Status.TODO, Status.DOING);

    private PlanContract() {
    }

    /**
     * The Refine exit (JAVA-1592): both slots are checked together and every failed one is named in one answer. The
     * workflow must be set and still fit the card ({@code problems} is what {@link CardWorkflow#problemsFor} reports
     * now) and name a refine role; the plan must be written, open with {@code Base:} and, when the workflow names a
     * refine role, carry a {@code Role: <id>} line with that role. A blank plan keeps its sentence from before. The
     * workflow is the one that governs the card: in an epic whose workflow is written, its part for the card's row
     * (card://JAVA-1885), and with none the refusal says where to write it.
     */
    public static void requireExit(Executor executor, Category category, Status from, Status to,
            GoverningWorkflow governing, List<CardWorkflow.Problem> problems, String actionPlan) {
        // Set.of(...).contains(null) throws, and an uncategorized card is planned like any other.
        boolean exempt = category != null && EXEMPT.contains(category);
        if (from != Status.REFINE || !WORK.contains(to) || executor == Executor.HUMAN || exempt) {
            return;
        }
        CardWorkflow workflow = governing.workflow();
        Optional<String> refineRole = Optional.ofNullable(workflow)
                .flatMap(w -> w.pick(Phase.REFINE)).map(CardWorkflow.Pick::role);
        List<String> missing = new ArrayList<>();
        if (workflow == null) {
            missing.add(governing.missing());
        } else if (!problems.isEmpty()) {
            missing.add("the workflow no longer fits the card: " + problems.stream()
                    .map(CardWorkflow.Problem::text).collect(Collectors.joining("; ")));
        } else if (refineRole.isEmpty()) {
            missing.add("the workflow names no role for refine");
        }
        missing.addAll(planProblems(actionPlan, refineRole.orElse(null)));
        if (!missing.isEmpty()) {
            throw OfficiumException.conflict(CategoryContracts.CONTRACT_UNMET, "Refine contract, exit: "
                    + String.join("; ", missing) + ". Fix each before the card leaves Refine for " + to.wire() + ".");
        }
    }

    /**
     * A plan is written once a card is an {@code ai} card in Refine with no workflow (JAVA-1592): setting it before the
     * workflow answers {@code workflow_first}. Clearing it, resending the same one, or any other edit is not refused.
     */
    public static void requireWorkflowFirst(Executor executor, Category category, Status status,
            CardWorkflow workflow, String currentPlan, String nextPlan) {
        boolean exempt = category != null && EXEMPT.contains(category);
        boolean setting = nextPlan != null && !nextPlan.isBlank() && !nextPlan.equals(currentPlan);
        if (executor != Executor.AI || exempt || status != Status.REFINE || workflow != null || !setting) {
            return;
        }
        throw OfficiumException.conflict("workflow_first", "The action plan is written after the workflow. Set the"
                + " workflow first (cards.setWorkflow): its refine role is the one the plan is written under.");
    }

    private static List<String> planProblems(String actionPlan, String refineRole) {
        if (actionPlan == null || actionPlan.isBlank()) {
            return List.of("the card has no action plan (cards.update actionPlan, opening with `Base: <control branch"
                    + " | main | branch name>`)");
        }
        List<String> lines = actionPlan.lines().map(String::strip).filter(line -> !line.isEmpty()).toList();
        List<String> problems = new ArrayList<>();
        if (!lines.getFirst().startsWith("Base:")) {
            problems.add("the action plan's first line is not `Base: <control branch | main | branch name>`");
        }
        if (refineRole != null && lines.stream().noneMatch(line -> namesRole(line, refineRole))) {
            problems.add("the action plan has no `Role: " + refineRole + "` line (the workflow's refine role)");
        }
        return problems;
    }

    /** A {@code Role: <id>} line names the role when the id is its leading token: {@code Role: tech-lead. Prose} does, {@code Role: tech-leader} does not. */
    private static boolean namesRole(String line, String role) {
        return line.matches("Role: " + Pattern.quote(role) + "(?:[\\s.,;(].*)?");
    }
}
