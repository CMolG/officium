package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

/**
 * Contributions by AI work profile (card://JAVA-1527): a period's review exits, send-backs and escaped defects,
 * each laid on the profile that ran the card's Action (else its Refine) by the {@link PhaseRun} kept when it left
 * that phase, plus the time spent under each profile and on the corrective cards that name its cards. A card with
 * no phase run (moved before runs were kept) is left out rather than guessed, and so is a phase a person moved a card
 * out of: only an agent's run is laid on a profile. A corrective card's time is the debt of its origin's profile, never
 * also its own. A reviewing model catches once per send-back that named a rule. Pure: the caller loads, this counts.
 */
public final class ProfileTally {

    /** A cell is suggested a stronger model over at least this many reviews in the period. */
    public static final int MIN_REVIEWED = 5;
    /** The key of cards run under no profile: Officium's own defaults. */
    public static final String DEFAULTS = "officium-defaults";
    /** The two measures a recommendation can fire on (card://JAVA-1804). */
    public static final String VIOLATIONS = "violations";
    public static final String SEND_BACKS = "send-backs";

    private static final Map<String, String> STRONGER = Map.of("claude-haiku-5-5", "claude-sonnet-5-5",
            "claude-sonnet-5-5", "claude-opus-5-5");
    private static final Set<QualityDimension> HEALTH = EnumSet.of(QualityDimension.ARCHITECTURE,
            QualityDimension.CLEAN_CODE);

    /** {@code tokenCards}: the cards that recorded tokens, all time (card://JAVA-1588). */
    public record Input(Map<UUID, Card> cards, List<PhaseRun> runs, List<ReviewOutcome> outcomes,
            List<ReviewReturn> returns, List<EscapedDefect> defects, List<CardTimeEntry> time, Instant start,
            Instant end, Set<UUID> tokenCards) {
    }

    public record View(Thresholds thresholds, List<Row> byProfile, List<Catch> reviewerCatch, List<Cell> cells,
            List<Recommendation> recommendations, List<Escape> escapedDefects) {
    }

    public record Thresholds(double violationRate, double sendBackRate, int minReviewed) {
    }

    public record Row(String profileId, int reviewed, int firstTime, int passedFirstTime, Double firstTimePassRate,
            Map<String, Integer> sendBackReasons, Map<String, Integer> violationsByDimension,
            Map<String, Integer> escapedByPhase, Double codeHealthRate, Cost cost) {
    }

    /** Own work, debt (time on the corrective cards that name this profile's cards), and per clean delivery.
     *  Tokens are averaged over the clean deliveries that recorded some ({@code cleanWithTokens}, JAVA-1588). */
    public record Cost(double hours, TokenUsage tokens, double debtHours, TokenUsage debtTokens, int cleanDeliveries,
            int cleanWithTokens, Double hoursPerCleanDelivery, TokenUsage tokensPerCleanDelivery) {
    }

    public record Catch(String model, int caught, int escaped, Double rate) {
    }

    /** {@code violating}: reviews that broke an architecture or clean-code rule. {@code sentBack}: reviews that sent the
     *  card back for a reason other than integration-failed (card://JAVA-1804). */
    public record Cell(String profileId, String category, String phase, String model, int reviewed, int violating,
            Double violationRate, int sentBack, Double sendBackRate) {
    }

    /** {@code firedBy}: the measures that reached the bar, in {@link #VIOLATIONS}, {@link #SEND_BACKS} order. */
    public record Recommendation(String profileId, String category, String phase, String model, String raiseTo,
            int reviewed, int violating, double violationRate, int sentBack, double sendBackRate,
            List<String> firedBy) {
    }

    public record Escape(String originKey, String correctiveKey, String escapedIn, String profileId, Instant at) {
    }

    private static final class Acc {
        int reviewed;
        int healthy;
        int firstTime;
        int passedFirstTime;
        int clean;
        int cleanWithTokens;
        double hours;
        double debtHours;
        TokenUsage tokens = TokenUsage.ZERO;
        TokenUsage debtTokens = TokenUsage.ZERO;
        final Map<String, Integer> reasons = new TreeMap<>();
        final Map<String, Integer> violations = new TreeMap<>();
        final Map<String, Integer> escaped = new TreeMap<>();
    }

    private record CellKey(String profileId, String category, String model) {
    }

    private ProfileTally() {
    }

    public static View of(Input in, ProfileRecommendationSettings settings) {
        Map<UUID, List<PhaseRun>> runs = byCard(in.runs(), PhaseRun::cardId, PhaseRun::at);
        Map<UUID, List<ReviewOutcome>> outcomes = byCard(in.outcomes(), ReviewOutcome::cardId, ReviewOutcome::at);
        Map<UUID, ReviewReturn> returns = new HashMap<>();
        in.returns().forEach(r -> returns.put(r.id(), r));
        Map<String, Acc> rows = new TreeMap<>();
        Map<CellKey, int[]> cells = new HashMap<>();
        Map<String, int[]> catches = new TreeMap<>();
        Set<UUID> named = new HashSet<>();
        in.defects().forEach(d -> named.add(d.originCardId()));

        for (ReviewOutcome outcome : in.outcomes()) {
            Optional<PhaseRun> action = attribution(runs, outcome.cardId(), outcome.at());
            if (!within(outcome.at(), in) || action.isEmpty()) {
                continue;
            }
            Acc acc = rows.computeIfAbsent(key(action.get()), k -> new Acc());
            boolean unhealthy = outcome.ruleViolations().stream().anyMatch(r -> HEALTH.contains(r.dimension()));
            acc.reviewed++;
            acc.healthy += unhealthy ? 0 : 1;
            outcome.ruleViolations().forEach(r -> acc.violations.merge(r.dimension().wire(), 1, Integer::sum));
            Category category = action.get().category();
            int[] cell = cells.computeIfAbsent(new CellKey(key(action.get()),
                    category == null ? null : category.wire(), action.get().model()), k -> new int[3]);
            cell[0]++;
            cell[1] += unhealthy ? 1 : 0;
            cell[2] += sentBack(outcome, returns) ? 1 : 0;
            exitRun(runs, outcome)
                    .ifPresent(review -> catches.computeIfAbsent(modelOf(review), m -> new int[2])[0] += outcome
                            .ruleViolations().isEmpty() ? 0 : 1);
            if (outcomes.get(outcome.cardId()).get(0) == outcome) {
                boolean passed = outcome.verdict() == ReviewOutcome.Verdict.APPROVED;
                acc.firstTime++;
                acc.passedFirstTime += passed ? 1 : 0;
                boolean clean = passed && !named.contains(outcome.cardId());
                acc.clean += clean ? 1 : 0;
                acc.cleanWithTokens += clean && in.tokenCards().contains(outcome.cardId()) ? 1 : 0;
            }
        }
        for (ReviewReturn sentBack : in.returns()) {
            attribution(runs, sentBack.cardId(), sentBack.at()).filter(run -> within(sentBack.at(), in))
                    .ifPresent(run -> sentBack.reasons().forEach(reason -> rows.computeIfAbsent(key(run),
                            k -> new Acc()).reasons.merge(reason.wire(), 1, Integer::sum)));
        }
        List<Escape> escapes = new ArrayList<>();
        Map<UUID, String> debtOf = new HashMap<>();
        for (EscapedDefect defect : in.defects()) {
            Optional<PhaseRun> origin = attribution(runs, defect.originCardId(), defect.at());
            if (!within(defect.at(), in) || origin.isEmpty()) {
                continue;
            }
            String profile = key(origin.get());
            rows.computeIfAbsent(profile, k -> new Acc()).escaped.merge(defect.escapedIn().wire(), 1, Integer::sum);
            debtOf.put(defect.correctiveCardId(), profile);
            Card card = in.cards().get(defect.originCardId());
            escapes.add(new Escape(card == null ? null : card.key(), defect.correctiveKey(), defect.escapedIn().wire(),
                    profile, defect.at()));
            if (defect.escapedIn() == EscapedPhase.REVIEW) {
                last(runs, defect.originCardId(), Status.REVIEW, defect.at())
                        .ifPresent(review -> catches.computeIfAbsent(modelOf(review), m -> new int[2])[1]++);
            }
        }
        for (CardTimeEntry entry : in.time()) {
            String debt = debtOf.get(entry.cardId());
            if (debt != null) {
                Acc acc = rows.computeIfAbsent(debt, k -> new Acc());
                acc.debtHours += entry.hours();
                acc.debtTokens = acc.debtTokens.plus(tokensOf(entry));
                continue;
            }
            String profile = entry.profileId() != null
                    ? entry.profileId()
                    : runs.containsKey(entry.cardId()) && entry.source() == TimeSource.AGENT_SESSION ? DEFAULTS : null;
            if (profile != null) {
                Acc acc = rows.computeIfAbsent(profile, k -> new Acc());
                acc.hours += entry.hours();
                acc.tokens = acc.tokens.plus(tokensOf(entry));
            }
        }
        return view(rows, cells, catches, escapes, settings);
    }

    /** A send-back counts unless integration-failed is its only reason: that says nothing about the author's work
     *  (ADR 0031). A send-back whose return is not found counts, since nothing says the integration caused it. */
    private static boolean sentBack(ReviewOutcome outcome, Map<UUID, ReviewReturn> returns) {
        if (outcome.verdict() != ReviewOutcome.Verdict.SENT_BACK) {
            return false;
        }
        ReviewReturn send = outcome.reviewReturnId() == null ? null : returns.get(outcome.reviewReturnId());
        return send == null || send.reasons().stream().anyMatch(r -> r != ReviewReturnReason.INTEGRATION_FAILED);
    }

    private static View view(Map<String, Acc> rows, Map<CellKey, int[]> cells, Map<String, int[]> catches,
            List<Escape> escapes, ProfileRecommendationSettings settings) {
        List<Row> byProfile = rows.entrySet().stream().map(e -> row(e.getKey(), e.getValue())).toList();
        List<Cell> cellRows = cells.entrySet().stream()
                .map(e -> new Cell(e.getKey().profileId(), e.getKey().category(), "action", e.getKey().model(),
                        e.getValue()[0], e.getValue()[1], share(e.getValue()[1], e.getValue()[0]), e.getValue()[2],
                        share(e.getValue()[2], e.getValue()[0])))
                .sorted(Comparator.comparing(Cell::profileId).thenComparing(Cell::category,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        List<Recommendation> recommendations = cellRows.stream().flatMap(c -> recommend(c, settings).stream()).toList();
        List<Catch> catchRows = catches.entrySet().stream().map(e -> new Catch(e.getKey(), e.getValue()[0],
                e.getValue()[1], share(e.getValue()[0], e.getValue()[0] + e.getValue()[1]))).toList();
        return new View(new Thresholds(settings.raiseAt(), settings.raiseAt(), MIN_REVIEWED), byProfile, catchRows,
                cellRows, recommendations,
                escapes.stream().sorted(Comparator.comparing(Escape::at).reversed()).toList());
    }

    /** A cell is asked for a stronger model over {@link #MIN_REVIEWED} reviews when either measure reaches the bar. */
    private static Optional<Recommendation> recommend(Cell c, ProfileRecommendationSettings settings) {
        if (c.reviewed() < MIN_REVIEWED || !STRONGER.containsKey(c.model())
                || !WorkProfiles.allows(c.profileId(), STRONGER.get(c.model()))) {
            return Optional.empty();
        }
        List<String> firedBy = new ArrayList<>();
        if (c.violationRate() != null && c.violationRate() >= settings.raiseAt()) {
            firedBy.add(VIOLATIONS);
        }
        if (c.sendBackRate() != null && c.sendBackRate() >= settings.raiseAt()) {
            firedBy.add(SEND_BACKS);
        }
        return firedBy.isEmpty()
                ? Optional.empty()
                : Optional.of(new Recommendation(c.profileId(), c.category(), c.phase(), c.model(),
                        STRONGER.get(c.model()), c.reviewed(), c.violating(), c.violationRate(), c.sentBack(),
                        c.sendBackRate(), firedBy));
    }

    private static Row row(String profile, Acc acc) {
        double hours = acc.hours + acc.debtHours;
        TokenUsage tokens = acc.tokens.plus(acc.debtTokens);
        Cost cost = new Cost(round(acc.hours), acc.tokens, round(acc.debtHours), acc.debtTokens, acc.clean,
                acc.cleanWithTokens, acc.clean == 0 ? null : round(hours / acc.clean),
                acc.cleanWithTokens == 0 ? null : tokens.scaled(1.0 / acc.cleanWithTokens));
        return new Row(profile, acc.reviewed, acc.firstTime, acc.passedFirstTime,
                share(acc.passedFirstTime, acc.firstTime), acc.reasons, acc.violations, acc.escaped,
                share(acc.healthy, acc.reviewed), cost);
    }

    /** The run that ran the card's Action before {@code at}, else its Refine. */
    static Optional<PhaseRun> attribution(Map<UUID, List<PhaseRun>> runs, UUID cardId, Instant at) {
        return last(runs, cardId, Status.DOING, at).or(() -> last(runs, cardId, Status.REFINE, at));
    }

    private static Optional<PhaseRun> last(Map<UUID, List<PhaseRun>> runs, UUID cardId, Status from, Instant at) {
        return runs.getOrDefault(cardId, List.of()).stream()
                .filter(run -> run.actorKind() == ActorKind.AGENT && run.from() == from && !run.at().isAfter(at))
                .reduce((a, b) -> b);
    }

    /** The run kept by the review exit itself: the same card, leaving the same status at the same instant. */
    private static Optional<PhaseRun> exitRun(Map<UUID, List<PhaseRun>> runs, ReviewOutcome outcome) {
        return runs.getOrDefault(outcome.cardId(), List.of()).stream()
                .filter(run -> run.actorKind() == ActorKind.AGENT && run.from() == outcome.from()
                        && run.at().equals(outcome.at()))
                .findFirst();
    }

    private static <T> Map<UUID, List<T>> byCard(Collection<T> items, java.util.function.Function<T, UUID> card,
            java.util.function.Function<T, Instant> at) {
        Map<UUID, List<T>> grouped = new HashMap<>();
        items.stream().sorted(Comparator.comparing(at))
                .forEach(item -> grouped.computeIfAbsent(card.apply(item), k -> new ArrayList<>()).add(item));
        return grouped;
    }

    private static String key(PhaseRun run) {
        return run.profileId() == null ? DEFAULTS : run.profileId();
    }

    private static String modelOf(PhaseRun run) {
        return run.model() == null ? "unknown" : run.model();
    }

    private static TokenUsage tokensOf(CardTimeEntry entry) {
        return entry.tokens() == null ? TokenUsage.ZERO : entry.tokens();
    }

    private static boolean within(Instant at, Input in) {
        return !at.isBefore(in.start()) && at.isBefore(in.end());
    }

    private static Double share(int part, int whole) {
        return whole == 0 ? null : Math.round(part * 1000.0 / whole) / 1000.0;
    }

    private static double round(double hours) {
        return Math.round(hours * 100) / 100.0;
    }
}
