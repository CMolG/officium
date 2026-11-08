package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.function.Predicate;

/**
 * The quality-lineage rule of corrective cards (card://JAVA-1525): a defect that comes back after an earlier
 * card's delivery names that card ({@link QualityLineage}), so the profile and the reviewer that let it through
 * are charged with it. {@code bug}, {@code regression} and {@code hotfix} always state it ({@code Caused by:
 * legacy} when no card can be named); {@code refactor}, {@code technicalDebt} and {@code enhancement} state it when
 * they correct an earlier card ({@code Caused by:} naming one). Checked where a card enters work (out of Refine)
 * and where its run ends (Review, Deploy, Done), gated like {@link CategoryContracts}: an agent's {@code ai} card,
 * never a person and never a wall.
 */
public final class LineageContract {

    /** The contract line, as {@link CategoryGuide} words it. */
    public static final String LINE = "Its lineage: the card that caused it, the phase that let it through, the "
            + "quality dimension that failed and the rules it broke.";

    private static final Set<Category> REQUIRED = Set.of(Category.BUG, Category.REGRESSION, Category.HOTFIX);
    private static final Set<Category> WHEN_NAMED = Set.of(Category.REFACTOR, Category.TECHNICAL_DEBT,
            Category.ENHANCEMENT);
    private static final Set<Status> WORK_STARTED = Set.of(Status.TODO, Status.DOING);
    private static final Set<Status> RUN_ENDED = Set.of(Status.REVIEW, Status.DEPLOY, Status.DONE);

    private LineageContract() {
    }

    /** Whether a card of this category can carry a lineage at all. */
    public static boolean corrective(Category category) {
        return category != null && (REQUIRED.contains(category) || WHEN_NAMED.contains(category));
    }

    /**
     * Whether this move (or a creation, {@code from} null) is where a lineage is checked and recorded: entering
     * To do or In progress out of Refine, or ending a run in Review, Deploy or Done.
     */
    public static boolean checkpoint(Status from, Status to) {
        boolean entersWork = WORK_STARTED.contains(to) && (from == null || from == Status.REFINE);
        boolean endsRun = RUN_ENDED.contains(to) && (from == null || !RUN_ENDED.contains(from));
        return entersWork || endsRun;
    }

    /**
     * Refuses with {@code contract_unmet} an agent's corrective {@code ai} card whose description does not state
     * its lineage at a checkpoint, naming each line to write. A named origin must be a live card of the project
     * ({@code liveCard}) other than the card itself ({@code ownKey}, null on a creation).
     */
    public static void require(ActorKind actor, Executor executor, Category category, Status from, Status to,
            String description, String ownKey, Predicate<String> liveCard) {
        if (actor != ActorKind.AGENT || executor == Executor.HUMAN || !corrective(category)
                || !checkpoint(from, to)) {
            return;
        }
        QualityLineage.Lines lines = QualityLineage.lines(description);
        List<String> problems = new ArrayList<>(QualityLineage.problems(lines, REQUIRED.contains(category)));
        if (problems.isEmpty()) {
            QualityLineage.parse(description).filter(QualityLineage::namesCard).map(QualityLineage::causedBy)
                    .ifPresent(origin -> {
                        if (origin.equals(ownKey)) {
                            problems.add("`" + QualityLineage.CAUSED_BY_LINE + "` names the card itself: name the "
                                    + "card whose delivery caused the defect.");
                        } else if (!liveCard.test(origin)) {
                            problems.add("`" + QualityLineage.CAUSED_BY_LINE + " " + origin + "` is not a live card "
                                    + "of this project.");
                        }
                    });
        }
        if (problems.isEmpty()) {
            return;
        }
        throw OfficiumException.conflict(CategoryContracts.CONTRACT_UNMET, category.wire() + " contract, lineage: \""
                + LINE + "\" " + String.join(" ", problems) + " Investigate where the defect came from and why the "
                + "origin's review missed it; the board checks the lines, the reviewer that they are true.");
    }
}
