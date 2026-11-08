package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardTimeEntry;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.DeliveryFlow;
import com.javadaba.contexts.officium.domain.ModelPrices;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.ProfileRecommendationSettings;
import com.javadaba.contexts.officium.domain.ProfileTally;
import com.javadaba.contexts.officium.domain.RejectionTally;
import com.javadaba.contexts.officium.domain.ReviewReturn;
import com.javadaba.contexts.officium.domain.ReviewReturnTally;
import com.javadaba.contexts.officium.domain.Sprint;
import com.javadaba.contexts.officium.domain.TimeConcept;
import com.javadaba.contexts.officium.domain.TimeSource;
import com.javadaba.contexts.officium.domain.TokenCoverage;
import com.javadaba.contexts.officium.domain.TokenUsage;
import com.javadaba.contexts.officium.domain.ports.ActivityRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.CardReviewReturnRepository;
import com.javadaba.contexts.officium.domain.ports.CardTimeEntryRepository;
import com.javadaba.contexts.officium.domain.ports.QualitySettingsRepository;
import com.javadaba.contexts.officium.domain.ports.SprintRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Contributions (JAVA-55, contract §8.3): what a project delivered in a period, who did it, how long
 * it took. Computed here, from the activity log and the time entries, so the web and an agent
 * ({@code metrics.get}) read the same numbers. The flow rules live in {@link DeliveryFlow}.
 */
@ApplicationScoped
public class MetricsService {

    static final int LONGEST_OPEN = 10;

    private final ProjectAccessGuard guard;
    private final CardRepository cards;
    private final CardTimeEntryRepository entries;
    private final ActivityRepository activity;
    private final SprintRepository sprints;
    private final CardReviewReturnRepository reviewReturns;
    private final QualityLedger quality;
    private final ValueService valueReport;
    private final ModelPriceTable modelPrices;
    private final QualitySettingsRepository qualitySettings;
    private final Clock clock;

    @Inject
    public MetricsService(ProjectAccessGuard guard, CardRepository cards, CardTimeEntryRepository entries,
            ActivityRepository activity, SprintRepository sprints, CardReviewReturnRepository reviewReturns,
            QualityLedger quality, ValueService valueReport, ModelPriceTable modelPrices,
            QualitySettingsRepository qualitySettings) {
        this(guard, cards, entries, activity, sprints, reviewReturns, quality, valueReport, modelPrices,
                qualitySettings, Clock.systemUTC());
    }

    MetricsService(ProjectAccessGuard guard, CardRepository cards, CardTimeEntryRepository entries,
            ActivityRepository activity, SprintRepository sprints, CardReviewReturnRepository reviewReturns,
            QualityLedger quality, ValueService valueReport, ModelPriceTable modelPrices,
            QualitySettingsRepository qualitySettings, Clock clock) {
        this.guard = guard;
        this.cards = cards;
        this.entries = entries;
        this.activity = activity;
        this.sprints = sprints;
        this.reviewReturns = reviewReturns;
        this.quality = quality;
        this.valueReport = valueReport;
        this.modelPrices = modelPrices;
        this.qualitySettings = qualitySettings;
        this.clock = clock;
    }

    /** The value report of a month (card://JAVA-1047), reached from here so the MCP registry keeps its size. */
    public ValueService.View value(UUID accountId, UUID projectId, YearMonth month) {
        return valueReport.report(accountId, projectId, month);
    }

    /** A period by dates ({@code from}/{@code to}, inclusive), or a sprint's: from when it started to
     *  when it closed, or to now while it's active. */
    public MetricsView metrics(UUID accountId, UUID projectId, LocalDate from, LocalDate to, UUID sprintId) {
        guard.requireAccess(projectId, accountId);
        Instant now = Instant.now(clock);
        Instant start;
        Instant end;
        if (sprintId != null) {
            Sprint sprint = sprints.findById(projectId, sprintId)
                    .orElseThrow(() -> OfficiumException.notFound("sprint_not_found", "No such sprint"));
            if (sprint.startedAt() == null) {
                throw OfficiumException.conflict("sprint_not_started", "A planned sprint has no period yet");
            }
            start = sprint.startedAt();
            end = sprint.closedAt() == null ? now : sprint.closedAt();
        } else {
            if (from == null || to == null) {
                throw OfficiumException.badRequest("period_required", "Give from and to, or a sprintId");
            }
            if (to.isBefore(from)) {
                throw OfficiumException.badRequest("invalid_period", "to is before from");
            }
            start = from.atStartOfDay(ZoneOffset.UTC).toInstant();
            end = to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        }
        LocalDate fromDate = start.atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate toDate = (sprintId == null ? end.minusNanos(1) : end).atZone(ZoneOffset.UTC).toLocalDate();

        Map<UUID, Card> byId = cards.findAllByProject(projectId).stream()
                .collect(Collectors.toMap(Card::id, Function.identity()));
        List<DeliveryFlow.Move> moves = activity.listByOperation(projectId, "card.moved").stream()
                .map(DeliveryFlow::moveOf).flatMap(Optional::stream).toList();
        List<DeliveryFlow.Delivery> delivered = DeliveryFlow.deliveries(moves).stream()
                .filter(d -> !d.deliveredAt().isBefore(start) && d.deliveredAt().isBefore(end))
                .filter(d -> byId.containsKey(d.cardId()))
                .toList();
        List<CardTimeEntry> timeInPeriod = entries.listByProjectAndRange(projectId, fromDate, toDate, null);
        Map<UUID, TokenUsage> recorded = entries.tokensByCard(projectId);
        List<UUID> deliveredCards = delivered.stream().map(DeliveryFlow.Delivery::cardId).toList();
        TokenCoverage.Result coverage = TokenCoverage.of(deliveredCards, recorded, timeInPeriod);
        Map<UUID, Instant> lastArrivals = DeliveryFlow.lastArrivals(moves);
        List<ReviewReturn> returns = reviewReturns.listByProject(projectId);

        ModelPrices prices = modelPrices.prices();
        return new MetricsView(new MetricsView.Period(fromDate, toDate, sprintId), delivered.size(),
                hours(timeInPeriod), MetricsTokens.tokens(timeInPeriod, coverage.perDelivery(), prices),
                coverage.view(), MetricsTokens.contributions(delivered, timeInPeriod, prices),
                byCategory(delivered, byId, projectId),
                longestOpen(byId.values(), lastArrivals, now),
                rejected(RejectionTally.of(byId.values(), lastArrivals, start, end)),
                reviewReturns(ReviewReturnTally.of(byId, returns, moves, start, end)),
                ProfileTally.of(ProfileInputs.of(quality, projectId, byId, returns, timeInPeriod, start, end,
                        recorded.keySet()),
                        qualitySettings.profileRecommendations(projectId)
                                .orElse(ProfileRecommendationSettings.DEFAULTS)));
    }

    /** The cards the period rejected, by reason and category (card://JAVA-1415). */
    private static MetricsView.Rejected rejected(RejectionTally tally) {
        return new MetricsView.Rejected(tally.total(),
                tally.byReason().stream().map(r -> new MetricsView.ReasonCount(r.reason().wire(), r.count())).toList(),
                tally.byCategory().stream().map(c -> new MetricsView.CategoryCount(
                        c.category() == null ? null : c.category().wire(), c.count())).toList());
    }

    /** The send-backs of the period, by reason and category, and the first-time pass share (card://JAVA-1416). */
    private static MetricsView.ReviewReturns reviewReturns(ReviewReturnTally tally) {
        return new MetricsView.ReviewReturns(tally.total(),
                tally.byReason().stream().map(r -> new MetricsView.ReasonCount(r.reason().wire(), r.count())).toList(),
                tally.byCategory().stream().map(c -> new MetricsView.CategoryCount(
                        c.category() == null ? null : c.category().wire(), c.count())).toList(),
                new MetricsView.FirstTimePass(tally.firstTimePass().passed(), tally.firstTimePass().firstTime(),
                        tally.firstTimePass().share()));
    }

    /** Imputed is every agent's, from runs and from sessions; refine, test and work split the same total
     *  by what it was spent on (JAVA-245, JAVA-983). */
    private static MetricsView.Hours hours(List<CardTimeEntry> time) {
        double manual = time.stream().filter(e -> e.source() == TimeSource.MANUAL).mapToDouble(CardTimeEntry::hours)
                .sum();
        double total = time.stream().mapToDouble(CardTimeEntry::hours).sum();
        double refine = time.stream().filter(e -> e.concept() == TimeConcept.REFINE)
                .mapToDouble(CardTimeEntry::hours).sum();
        double test = time.stream().filter(e -> e.concept() == TimeConcept.TEST)
                .mapToDouble(CardTimeEntry::hours).sum();
        return new MetricsView.Hours(round(total), round(total - manual), round(manual), round(refine), round(test),
                round(total - refine - test));
    }

    /** Per category of the cards delivered. The mean of logged hours counts only cards with any: a
     *  card nobody logged time on says nothing about how long its kind takes. */
    private List<MetricsView.CategoryStat> byCategory(List<DeliveryFlow.Delivery> delivered, Map<UUID, Card> byId,
            UUID projectId) {
        if (delivered.isEmpty()) {
            return List.of();
        }
        Map<UUID, Double> loggedByCard = entries.totalHoursByCard(projectId);
        Map<Optional<Category>, List<DeliveryFlow.Delivery>> groups = new LinkedHashMap<>();
        for (DeliveryFlow.Delivery delivery : delivered) {
            groups.computeIfAbsent(Optional.ofNullable(byId.get(delivery.cardId()).category()),
                    k -> new ArrayList<>()).add(delivery);
        }
        List<MetricsView.CategoryStat> result = new ArrayList<>();
        for (Map.Entry<Optional<Category>, List<DeliveryFlow.Delivery>> group : groups.entrySet()) {
            List<DeliveryFlow.Delivery> items = group.getValue();
            Double meanCycle = mean(items.stream().map(DeliveryFlow.Delivery::cycleHours).filter(Objects::nonNull)
                    .toList());
            Double meanLogged = mean(items.stream().map(d -> loggedByCard.get(d.cardId()))
                    .filter(h -> h != null && h > 0).toList());
            result.add(new MetricsView.CategoryStat(group.getKey().map(Category::wire).orElse(null), items.size(),
                    meanCycle, meanLogged));
        }
        result.sort(Comparator.comparingInt(MetricsView.CategoryStat::delivered).reversed());
        return result;
    }

    private static List<MetricsView.OpenCard> longestOpen(java.util.Collection<Card> all,
            Map<UUID, Instant> lastArrivals, Instant now) {
        return all.stream()
                .filter(c -> !c.status().finished() && !c.status().closed())
                .sorted(Comparator.comparing(Card::createdAt))
                .limit(LONGEST_OPEN)
                .map(c -> new MetricsView.OpenCard(c.key(), c.title(), c.status().wire(),
                        c.category() == null ? null : c.category().wire(),
                        round(DeliveryFlow.hoursBetween(c.createdAt(), now)),
                        round(DeliveryFlow.hoursBetween(lastArrivals.getOrDefault(c.id(), c.createdAt()), now))))
                .toList();
    }

    private static Double mean(List<Double> values) {
        return values.isEmpty() ? null : round(values.stream().mapToDouble(Double::doubleValue).average().orElse(0));
    }

    static double round(double hours) {
        return Math.round(hours * 100) / 100.0;
    }

    /** Wire shape (contract §8.3). {@code profiles}: by AI work profile (card://JAVA-1527). */
    public record MetricsView(Period period, int delivered, Hours hours, Tokens tokens,
            TokenCoverage.View tokenCoverage, List<Contribution> contributions, List<CategoryStat> byCategory,
            List<OpenCard> longestOpen,
            Rejected rejected, ReviewReturns reviewReturns, ProfileTally.View profiles) {

        public record Period(LocalDate from, LocalDate to, UUID sprintId) {
        }

        public record Hours(double total, double imputed, double manual, double refine, double test,
                double work) {
        }

        /** {@code perDelivery}: the average over the covered deliveries, null when none is covered. {@code cost}: the
         *  estimate at API list prices (card://JAVA-1777). */
        public record Tokens(long tokensIn, long cachedTokensIn, long reasoningTokens, long tokensOut,
                List<ModelTokens> byModel, TokenUsage perDelivery, Cost cost) {
        }

        /** {@code usd}: the estimate at API list prices, null when no row of the model could be priced. */
        public record ModelTokens(String model, long tokensIn, long cachedTokensIn, long reasoningTokens,
                long tokensOut, Double usd) {
        }

        public record Cost(Double usd, int unpricedRows, List<String> unpricedModels) {
        }

        public record Contribution(String who, String kind, int delivered, double hours, Double usd,
                int unpricedRows) {
        }

        public record CategoryStat(String category, int delivered, Double meanCycleHours, Double meanLoggedHours) {
        }

        public record OpenCard(String key, String title, String status, String category, double ageHours,
                double inStatusHours) {
        }

        public record Rejected(int total, List<ReasonCount> byReason, List<CategoryCount> byCategory) {
        }

        public record ReviewReturns(int total, List<ReasonCount> byReason, List<CategoryCount> byCategory,
                FirstTimePass firstTimePass) {
        }

        public record FirstTimePass(int passed, int firstTime, Double share) {
        }

        public record ReasonCount(String reason, int count) {
        }

        public record CategoryCount(String category, int count) {
        }
    }
}
