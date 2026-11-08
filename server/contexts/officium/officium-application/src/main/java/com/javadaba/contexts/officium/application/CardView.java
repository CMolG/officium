package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Assignee;
import com.javadaba.contexts.officium.domain.CardRoles;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardWorkflow;
import com.javadaba.contexts.officium.domain.CardLinkLists;
import com.javadaba.contexts.officium.domain.CardRejection;
import com.javadaba.contexts.officium.domain.EpicCheckpoints;
import com.javadaba.contexts.officium.domain.EscapedDefect;
import com.javadaba.contexts.officium.domain.GoverningWorkflow;
import com.javadaba.contexts.officium.domain.HumanEdit;
import com.javadaba.contexts.officium.domain.ModRules;
import com.javadaba.contexts.officium.domain.Phase;
import com.javadaba.contexts.officium.domain.QualityLineage;
import com.javadaba.contexts.officium.domain.QualityRule;
import com.javadaba.contexts.officium.domain.ReviewOutcome;
import com.javadaba.contexts.officium.domain.ReviewReturn;
import com.javadaba.contexts.officium.domain.ReviewReturnReason;
import com.javadaba.contexts.officium.domain.ReviewRework;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.contexts.officium.domain.RunConfig;
import com.javadaba.contexts.officium.domain.RunShuffle;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.ToolTier;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Wire shape of {@link Card} (contract §2): enums as their wire strings, links composed on top
 * ({@code related}/{@code blocks}/{@code blockedBy} as card keys, {@code blocked} derived).
 *
 * <p>The human edit goes out FLAT ({@code humanEditedAt}, {@code humanEditedBy},
 * {@code humanEditReviewedAt}, {@code humanEditPending}) rather than nested: it is the one thing an
 * agent filters and branches on, and a flat boolean reads the same in a JSON dump, a Markdown
 * export and a query parameter.
 */
public record CardView(
        UUID id,
        UUID projectId,
        String key,
        int number,
        String title,
        String description,
        String actionPlan,
        String excerpt,
        String status,
        String runState,
        String priority,
        String executor,
        /** Its wire value, or null while nobody has said what kind of work the card is. */
        String category,
        int order,
        double estimate,
        String epic,
        List<String> tags,
        List<Assignee> assignees,
        List<String> related,
        List<String> blocks,
        List<String> blockedBy,
        /** Blockers that finished, and what this card blocked that is finished, with the direction (JAVA-1114). */
        List<CardLinkLists.RelatedBy> relatedBy,
        boolean blocked,
        int version,
        Instant createdAt,
        Instant updatedAt,
        ActorJson createdBy,
        ActorJson updatedBy,
        Instant humanEditedAt,
        ActorJson humanEditedBy,
        Instant humanEditReviewedAt,
        boolean humanEditPending,
        /** Null while the card is in the backlog (contract §8.2). */
        UUID sprintId,
        int rank,
        /** Wire values, in {@code Signal} order (JAVA-294). */
        List<String> signals,
        /** A spike's subtype wire value, {@code technical} or {@code ux-ui}; null off a spike (JAVA-391). */
        String subtype,
        /**
         * The Fluxor role ids that may work the card now: its category's roles for the phase its status
         * is in (a ux-ui spike's own row), plus its signals', under the project's role matrix (JAVA-294).
         */
        List<String> eligibleRoles,
        /**
         * The kind of work the card's status asks for ({@link Phase} wire name), null once done: a card
         * {@code cards.next} hands out is worked under the roles of this phase (JAVA-372).
         */
        String phase,
        /**
         * When an agent's spike in progress is delivered to Ready by its time box: its last move into In
         * progress plus its {@code Time box:} line (JAVA-878). Null for every other card.
         */
        Instant timeBoxEndsAt,
        /**
         * The questions the card's Quaestio form asks (JAVA-890), null while it has none: what lets a list
         * (Needs you) offer "Answer (N questions)" without opening every card for its {@code form}.
         */
        Integer formQuestions,
        /**
         * The model and effort ({@code {model, effort}}) the card's category cell is worked with in its phase,
         * under the project's matrix (JAVA-915); null once done or with no category.
         */
        Map<String, String> runConfig,
        /** Each eligible role's {@code {model, effort}}: its override in that cell, else the cell's (JAVA-915). */
        Map<String, Map<String, String>> runConfigs,
        /**
         * Each eligible role's mods (card://JAVA-1569): the ones its sheet requires, then the matrix's cell and
         * signal mods, each once; a role with none is absent. Read each with {@code mods.get}.
         */
        Map<String, List<String>> mods,
        /** The sum of the card's time entries, 0 with none (JAVA-1376): what the board shows, with no timesheet read. */
        double loggedHours,
        /** Why a rejected card was rejected (card://JAVA-1415); null on every other card. */
        RejectionView rejection,
        /** Each time the card was sent back from review or deploy, oldest first; empty at birth (card://JAVA-1416). */
        List<ReviewReturnView> reviewReturns,
        /** The send-backs from review since the plan was last redone, against the cap (card://JAVA-1443). */
        ReviewReworkView reviewRework,
        /** The lineage its description states, when it states a complete one (card://JAVA-1525); null otherwise. */
        LineageView lineage,
        /** Each defect that escaped this card's delivery and came back as a corrective card, oldest first. */
        List<EscapedDefectView> escapedDefects,
        /** Whether any defect escaped this card's delivery: it counts against the profile that worked it. */
        boolean qualityRegressionTriggered,
        /** Each exit from review, oldest first: an approval's scorecard or a send-back's broken rules (JAVA-1526). */
        List<ReviewOutcomeView> reviewOutcomes,
        /**
         * The workflow that governs the card as it was written: its own (card://JAVA-1591) or, in an epic whose workflow
         * is written, that workflow's part for the card's row (card://JAVA-1885); null: the matrix answers every phase.
         */
        Map<String, Object> workflow,
        /** What is wrong with that workflow against the card now (card://JAVA-1592); empty when it fits or is none. */
        List<CardWorkflow.Problem> workflowProblems,
        /** The key of the epic whose workflow governs the card (card://JAVA-1885); null when its own does. */
        String workflowFrom,
        /** The precedence rule that ranks the card, with its place in the project's list; null when none does (JAVA-1686). */
        PrecedenceMark precedence,
        /** An epic's checkpoints completed of its total, its face's "N/M" (card://JAVA-1873); null on any other card. */
        EpicCheckpoints.Progress checkpointProgress) {

    private static final Logger LOG = Logger.getLogger(CardView.class.getName());

    /** {@code position} is the card's 1-based place under the rule, {@code of} how many rules the list has (ADR 0032). */
    public record PrecedenceMark(UUID ruleId, String name, String reason, int position, int of) {
    }

    /** One review exit: {@code scorecard} maps each scored dimension to {@code clean} or {@code minor_observations}. */
    public record ReviewOutcomeView(UUID id, Instant at, ActorJson by, String role, String from, String to,
            String verdict, List<String> ruleViolations, Map<String, String> scorecard, String observations,
            UUID reviewReturnId) {
        static ReviewOutcomeView of(ReviewOutcome outcome) {
            Map<String, String> scores = new LinkedHashMap<>();
            com.javadaba.contexts.officium.domain.QualityDimension.reviewedDimensions().stream()
                    .filter(outcome.scorecard()::containsKey)
                    .forEach(dimension -> scores.put(dimension.wire(), outcome.scorecard().get(dimension).wire()));
            return new ReviewOutcomeView(outcome.id(), outcome.at(), ActorJson.of(outcome.actor()), outcome.role(),
                    outcome.from().wire(), outcome.to().wire(), outcome.verdict().wire(),
                    QualityRule.ids(outcome.ruleViolations()), scores, outcome.observations(),
                    outcome.reviewReturnId());
        }
    }

    /** {@code causedBy} is the origin's key, or {@code legacy}; the rest is null for {@code legacy}. */
    public record LineageView(String causedBy, String escapedIn, String qualityDimension, List<String> violatedRules) {
        static LineageView of(String description) {
            return QualityLineage.parse(description).map(lineage -> lineage.namesCard()
                    ? new LineageView(lineage.causedBy(), lineage.escapedIn().wire(), lineage.dimension().wire(),
                            QualityRule.ids(lineage.rules()))
                    : new LineageView(QualityLineage.LEGACY, null, null, List.of())).orElse(null);
        }
    }

    /** One escaped defect: the corrective card that names this one, and how it escaped. */
    public record EscapedDefectView(UUID id, Instant at, ActorJson by, String correctiveKey, String escapedIn,
            String qualityDimension, List<String> violatedRules) {
        static EscapedDefectView of(EscapedDefect defect) {
            return new EscapedDefectView(defect.id(), defect.at(), ActorJson.of(defect.actor()),
                    defect.correctiveKey(), defect.escapedIn().wire(), defect.dimension().wire(),
                    QualityRule.ids(defect.rules()));
        }
    }

    /** One send-back: {@code commentId} is the findings comment, null once it is deleted. */
    public record ReviewReturnView(UUID id, Instant at, ActorJson by, String role, String from, String to,
            List<String> reasons, UUID commentId) {
        static ReviewReturnView of(ReviewReturn entry) {
            return new ReviewReturnView(entry.id(), entry.at(), ActorJson.of(entry.actor()), entry.role(),
                    entry.from().wire(), entry.to().wire(),
                    entry.reasons().stream().map(ReviewReturnReason::wire).toList(), entry.commentId());
        }
    }

    /** {@code streak}: the send-backs from review since the plan was last redone; {@code cap}: when it escalates. */
    public record ReviewReworkView(int streak, int cap) {
    }

    /**
     * {@code reason} is the wire id and {@code label} what a person reads; {@code card} is the key of the
     * card it names, null when it names none or that card was deleted since.
     */
    public record RejectionView(String reason, String label, String note, String card) {
    }

    /** {@code namedCardKey}: the key of the card a rejected card's rejection names, when it names a live one. */
    public static CardView of(Card card, CardLinkLists lists, RoleMatrix matrix, RunShuffle shuffle, ModRules modRules,
            Instant timeBoxEndsAt, Integer formQuestions, double loggedHours, String namedCardKey,
            List<ReviewReturn> reviewReturns, List<EscapedDefect> escapedDefects,
            List<ReviewOutcome> reviewOutcomes, Map<String, ToolTier> toolTiers, PrecedenceMark precedence,
            GoverningWorkflow governing) {
        return of(card, lists, matrix, shuffle, modRules, timeBoxEndsAt, formQuestions, loggedHours, namedCardKey,
                reviewReturns, escapedDefects, reviewOutcomes, toolTiers, precedence, governing, null);
    }

    /** {@code checkpointProgress}: the card's, when it is an epic (card://JAVA-1873). */
    public static CardView of(Card card, CardLinkLists lists, RoleMatrix matrix, RunShuffle shuffle, ModRules modRules,
            Instant timeBoxEndsAt, Integer formQuestions, double loggedHours, String namedCardKey,
            List<ReviewReturn> reviewReturns, List<EscapedDefect> escapedDefects,
            List<ReviewOutcome> reviewOutcomes, Map<String, ToolTier> toolTiers, PrecedenceMark precedence,
            GoverningWorkflow governing, EpicCheckpoints.Progress checkpointProgress) {
        HumanEdit edit = card.humanEdit();
        Map<String, Map<String, String>> runConfigs = runConfigsWithToolTiers(
                shuffle.applyAll(card.id(), card.category(), card.subtype(), card.status(),
                        CardRoles.runConfigs(matrix, card.category(), card.subtype(), card.status(), card.signals(),
                                governing.workflow())),
                toolTiers);
        return new CardView(
                card.id(), card.projectId(), card.key(), card.number(), card.title(), card.description(),
                card.actionPlan() == null ? "" : card.actionPlan(), card.excerpt(), card.status().wire(),
                card.runState().wire(), card.priority().wire(), card.executor().wire(),
                card.category() == null ? null : card.category().wire(), card.order(),
                card.estimate(), card.epic(), card.tags(), card.assignees(), lists.related(), lists.blocks(),
                lists.blockedBy(), lists.relatedBy(), lists.blocked(),
                card.version(), card.createdAt(), card.updatedAt(), ActorJson.of(card.createdBy()),
                ActorJson.of(card.updatedBy()), edit == null ? null : edit.editedAt(),
                edit == null ? null : ActorJson.of(edit.editedBy()), edit == null ? null : edit.reviewedAt(),
                card.humanEditPending(), card.sprintId(), card.rank(),
                card.signals().stream().map(Signal::wire).toList(),
                card.subtype() == null ? null : card.subtype().wire(),
                CardRoles.eligible(matrix, card.category(), card.subtype(), card.status(), card.signals(),
                        governing.workflow()),
                Phase.of(card.status()).map(Phase::wire).orElse(null), timeBoxEndsAt, formQuestions,
                CardRoles.runConfig(matrix, card.category(), card.subtype(), card.status(), card.signals(),
                        governing.workflow())
                        .map(run -> shuffle.apply(card.id(), card.category(), card.subtype(), card.status(), run))
                        .map(RunConfig::toWire).orElse(null),
                runConfigs, modsOf(card, governing.workflow(), matrix, modRules), loggedHours,
                rejection(card.rejection(), namedCardKey),
                reviewReturns.stream().map(ReviewReturnView::of).toList(),
                new ReviewReworkView(ReviewRework.streak(reviewReturns), ReviewRework.CAP),
                LineageView.of(card.description()),
                escapedDefects.stream().map(EscapedDefectView::of).toList(), !escapedDefects.isEmpty(),
                reviewOutcomes.stream().map(ReviewOutcomeView::of).toList(),
                governing.workflow() == null ? null : governing.workflow().wire(),
                governing.problems(matrix, modRules, card), governing.from(), precedence, checkpointProgress);
    }

    /**
     * Each role's {@code {model, effort}} with its {@code toolTier} beside them (JAVA-1445). A role the catalog gives
     * no tier to has no {@code toolTier} key: the catalog is the one that says what a role may do.
     */
    static Map<String, Map<String, String>> runConfigsWithToolTiers(Map<String, RunConfig> byRole,
            Map<String, ToolTier> toolTiers) {
        Map<String, Map<String, String>> runConfigs = new LinkedHashMap<>();
        byRole.forEach((role, run) -> {
            Map<String, String> wire = new LinkedHashMap<>(run.toWire());
            ToolTier tier = toolTiers.get(role);
            if (tier != null) {
                wire.put("toolTier", tier.wire());
            }
            runConfigs.put(role, wire);
        });
        return runConfigs;
    }

    private static Map<String, List<String>> modsOf(Card card, CardWorkflow workflow, RoleMatrix matrix,
            ModRules modRules) {
        return CardRoles.mods(matrix, modRules, card.category(), card.subtype(), card.status(), card.signals(),
                workflow,
                warning -> LOG.log(Level.WARNING, "{0} (card {1})", new Object[]{warning, card.key()}));
    }

    private static RejectionView rejection(CardRejection rejection, String namedCardKey) {
        return rejection == null
                ? null
                : new RejectionView(rejection.reason().wire(), rejection.reason().label(),
                        rejection.note(), namedCardKey);
    }
}
