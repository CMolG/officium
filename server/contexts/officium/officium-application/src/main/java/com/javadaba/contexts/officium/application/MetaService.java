package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.CardWorkflow;
import com.javadaba.contexts.officium.domain.CategoryGuide;
import com.javadaba.contexts.officium.domain.EscapedPhase;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.Phase;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.QualityDimension;
import com.javadaba.contexts.officium.domain.QualityLineage;
import com.javadaba.contexts.officium.domain.QualityRule;
import com.javadaba.contexts.officium.domain.RejectionReason;
import com.javadaba.contexts.officium.domain.ReviewReturnReason;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.contexts.officium.domain.RunState;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.Status;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/** {@code GET /officium/v1/meta} (contract §3): the fixed vocabulary, framework-free. */
public final class MetaService {

    private MetaService() {
    }

    /** {@code rejectionEnabled}: whether this deployment accepts a move to rejected yet (card://JAVA-1415). */
    public static Meta global(boolean rejectionEnabled) {
        return new Meta(wire(Status.values(), Status::wire), wire(Priority.values(), Priority::wire),
                wire(RunState.values(), RunState::wire), wire(Executor.values(), Executor::wire),
                wire(Role.values(), Role::wire), wire(Category.values(), Category::wire),
                CategoryGuide.all().stream()
                        .map(g -> new CategoryEntry(g.category().wire(), g.hint(), g.description()))
                        .toList(),
                CategoryGuide.classifierPrecedence().stream().map(Category::wire).toList(),
                wire(Signal.values(), Signal::wire), wire(Phase.values(), Phase::wire),
                RoleMatrix.defaults().toWire(),
                Arrays.stream(RejectionReason.values())
                        .map(r -> new RejectionReasonEntry(r.wire(), r.label(), r.hint(), r.namesCard())).toList(),
                rejectionEnabled,
                Arrays.stream(ReviewReturnReason.values())
                        .map(r -> new ReviewReturnReasonEntry(r.wire(), r.label(), r.hint())).toList(),
                Arrays.stream(QualityDimension.values())
                        .map(d -> new QualityDimensionEntry(d.wire(), d.label(), d.reviewed())).toList(),
                QualityRule.vocabulary(), wire(EscapedPhase.values(), EscapedPhase::wire),
                List.of(QualityLineage.CAUSED_BY_LINE, QualityLineage.ESCAPED_IN_LINE,
                        QualityLineage.QUALITY_DIMENSION_LINE, QualityLineage.VIOLATED_RULES_LINE),
                CardWorkflow.schema(), PrecedenceInput.describe());
    }

    private static <E> List<String> wire(E[] values, java.util.function.Function<E, String> toWire) {
        return Arrays.stream(values).map(toWire).toList();
    }

    public record Meta(List<String> statuses, List<String> priorities, List<String> runStates,
            List<String> executors, List<String> roles, List<String> categories,
            List<CategoryEntry> categoryGuide,
            /** Which category wins when a card fits several (JAVA-373); epic is not in it. */
            List<String> classifierPrecedence, List<String> signals, List<String> phases,
            /** The DEFAULT matrix (JAVA-294); a project's own comes from {@code RoleMatrixService}. */
            Map<String, Object> roleMatrix,
            /** Why a card may be rejected, the closed list (card://JAVA-1415). */
            List<RejectionReasonEntry> rejectionReasons,
            /** Whether a move to rejected is accepted yet: false until a later deploy turns it on (JAVA-1491). */
            boolean rejectionEnabled,
            /** Why a card may be sent back from review or deploy, the closed list (card://JAVA-1416). */
            List<ReviewReturnReasonEntry> reviewReturnReasons,
            /** Where a delivery's quality can fail (card://JAVA-1525); {@code reviewed} false for functional. */
            List<QualityDimensionEntry> qualityDimensions,
            /** The closed rule vocabulary, by dimension: ids are written {@code <dimension>:<rule>}. */
            Map<String, List<String>> qualityRules,
            /** The phases of an origin card a defect can escape. */
            List<String> escapedPhases,
            /** The description lines a corrective card states its lineage with, in order. */
            List<String> lineageLines,
            /** The JSON Schema of a card's own workflow, which cards.setWorkflow checks (card://JAVA-1591). */
            Map<String, Object> workflowSchema,
            /** The facets a precedence rule may name, its defaults and the caps (ADR 0032, JAVA-1686). */
            java.util.Map<String, Object> precedence) {
    }

    public record QualityDimensionEntry(String id, String label, boolean reviewed) {
    }

    public record ReviewReturnReasonEntry(String id, String label, String hint) {
    }

    /** {@code namesCard}: a rejection for this reason names the card it points to. */
    public record RejectionReasonEntry(String id, String label, String hint, boolean namesCard) {
    }

    /** What a category means (JAVA-293), read before creating or classifying a card. */
    public record CategoryEntry(String id, String hint, String description) {
    }
}
