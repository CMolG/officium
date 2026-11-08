package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The failure history around one planned card (card://JAVA-1803): the send-backs and escaped defects of the cards
 * around it, ranked by how they relate (code, then rule, then kind), under the project's budget, and the reason and
 * area pairs that recur in the window. Pure: the service hands it the window's rows and the paths the plan touches.
 */
public record PriorFailures(List<Item> items, List<Recurring> recurring, int droppedCards, int droppedFindings) {

    public static final int RECURRING_CAP = 5;
    public static final int RECURRING_CARDS_CAP = 5;

    /** How a neighbour relates to the planned card, strongest first: the same paths, a shared quality rule, a shared kind. */
    public enum Basis {
        CODE, RULE, KIND
    }

    /** One row of the window: a send-back with its reasons, or an escaped defect with its rules. */
    public record Failure(UUID id, Kind kind, Category category, String cardKey, List<Signal> signals, Instant at,
            List<ReviewReturnReason> reasons, List<QualityRule> ruleViolations, String quote, String title,
            String from, String to, String role) {

        public enum Kind {
            SEND_BACK, ESCAPED_DEFECT
        }

        public Failure {
            Objects.requireNonNull(id, "id");
            Objects.requireNonNull(kind, "kind");
            Objects.requireNonNull(at, "at");
            cardKey = key(cardKey);
            signals = signals == null ? List.of() : List.copyOf(signals);
            reasons = reasons == null ? List.of() : List.copyOf(reasons);
            ruleViolations = ruleViolations == null ? List.of() : List.copyOf(ruleViolations);
            quote = quote == null ? "" : quote;
        }

        /** An integration failure says nothing about the author's work, so it is no kind, rule or recurring neighbour. */
        boolean learns() {
            return kind == Kind.ESCAPED_DEFECT
                    || reasons.stream().anyMatch(reason -> reason != ReviewReturnReason.INTEGRATION_FAILED);
        }
    }

    /** A neighbour of the answer, with the bases it matched (strongest first) and the plan paths it shares. */
    public record Item(Failure failure, List<Basis> bases, List<String> paths) {
    }

    /** A reason and area that reach the threshold in the window; {@code cards} are the most recent, at most five. */
    public record Recurring(ReviewReturnReason reason, Area area, int count, List<String> cards) {
    }

    /** {@code kind} is {@code category}, {@code signal} or {@code path}. */
    public record Area(String kind, String value) {
    }

    /**
     * @param touched the plan's paths, each with the keys of the cards whose commits touched it
     * @param window  the rows of the window, most recent first; the planned card's own rows are ignored
     */
    public static PriorFailures answer(Card planned, List<Failure> window, Map<String, Set<String>> touched,
            PriorFailureSettings settings) {
        String ownKey = key(planned.key());
        Set<QualityDimension> lens = lens(planned.signals());
        Map<String, Set<String>> paths = new LinkedHashMap<>();
        touched.forEach(
                (path, keys) -> paths.put(path, keys.stream().map(PriorFailures::key).collect(Collectors.toSet())));
        List<Failure> others = window.stream().filter(failure -> !failure.cardKey().equals(ownKey)).toList();

        List<Match> ranked = others.stream()
                .map(failure -> match(planned, failure, lens, paths))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing((Match match) -> match.bases().get(0))
                        .thenComparing(match -> match.failure().at(), Comparator.reverseOrder())
                        .thenComparing(match -> match.failure().cardKey())
                        .thenComparing(match -> match.failure().id()))
                .toList();

        List<Item> items = new ArrayList<>();
        Set<String> cards = new LinkedHashSet<>();
        Set<String> droppedCards = new LinkedHashSet<>();
        int droppedFindings = 0;
        for (Match match : ranked) {
            String card = match.failure().cardKey();
            boolean fits = items.size() < settings.maxFindings()
                    && (cards.contains(card) || cards.size() < settings.maxCards());
            if (fits) {
                items.add(new Item(match.failure(), match.bases(), match.paths()));
                cards.add(card);
            } else {
                droppedFindings++;
                if (!cards.contains(card)) {
                    droppedCards.add(card);
                }
            }
        }
        return new PriorFailures(items, recurring(others, paths, settings.recurrenceThreshold()), droppedCards.size(),
                droppedFindings);
    }

    private record Match(Failure failure, List<Basis> bases, List<String> paths) {
    }

    private static Match match(Card planned, Failure failure, Set<QualityDimension> lens,
            Map<String, Set<String>> paths) {
        List<String> hit = paths.entrySet().stream()
                .filter(entry -> entry.getValue().contains(failure.cardKey()))
                .map(Map.Entry::getKey)
                .toList();
        EnumSet<Basis> bases = EnumSet.noneOf(Basis.class);
        if (!hit.isEmpty()) {
            bases.add(Basis.CODE);
        }
        if (failure.learns()) {
            if (failure.ruleViolations().stream().anyMatch(rule -> lens.contains(rule.dimension()))) {
                bases.add(Basis.RULE);
            }
            if (failure.kind() == Failure.Kind.SEND_BACK && sharesKind(planned, failure)) {
                bases.add(Basis.KIND);
            }
        }
        return bases.isEmpty() ? null : new Match(failure, List.copyOf(bases), hit);
    }

    private static boolean sharesKind(Card planned, Failure failure) {
        if (planned.category() == null || planned.category() != failure.category()) {
            return false;
        }
        Set<Signal> own = Set.copyOf(planned.signals());
        return own.isEmpty() && failure.signals().isEmpty()
                || failure.signals().stream().anyMatch(own::contains);
    }

    private record Recurrence(ReviewReturnReason reason, Area area) {
    }

    private static List<Recurring> recurring(List<Failure> rows, Map<String, Set<String>> paths, int threshold) {
        Map<Recurrence, Set<UUID>> ids = new LinkedHashMap<>();
        Map<Recurrence, Set<String>> cards = new LinkedHashMap<>();
        for (Failure failure : rows) {
            if (failure.kind() != Failure.Kind.SEND_BACK || !failure.learns()) {
                continue;
            }
            for (ReviewReturnReason reason : failure.reasons()) {
                if (reason == ReviewReturnReason.INTEGRATION_FAILED) {
                    continue;
                }
                for (Area area : areas(failure, paths)) {
                    Recurrence recurrence = new Recurrence(reason, area);
                    ids.computeIfAbsent(recurrence, k -> new LinkedHashSet<>()).add(failure.id());
                    cards.computeIfAbsent(recurrence, k -> new LinkedHashSet<>()).add(failure.cardKey());
                }
            }
        }
        return ids.entrySet().stream()
                .filter(entry -> entry.getValue().size() >= threshold)
                .sorted(Comparator.comparingInt((Map.Entry<Recurrence, Set<UUID>> entry) -> entry.getValue().size())
                        .reversed()
                        .thenComparing(entry -> entry.getKey().reason().wire())
                        .thenComparing(entry -> entry.getKey().area().value()))
                .limit(RECURRING_CAP)
                .map(entry -> new Recurring(entry.getKey().reason(), entry.getKey().area(), entry.getValue().size(),
                        cards.get(entry.getKey()).stream().limit(RECURRING_CARDS_CAP).toList()))
                .toList();
    }

    private static List<Area> areas(Failure failure, Map<String, Set<String>> paths) {
        List<Area> areas = new ArrayList<>();
        if (failure.category() != null) {
            areas.add(new Area("category", failure.category().wire()));
        }
        failure.signals().forEach(signal -> areas.add(new Area("signal", signal.wire())));
        paths.forEach((path, keys) -> {
            if (keys.contains(failure.cardKey())) {
                areas.add(new Area("path", path));
            }
        });
        return areas;
    }

    /** The dimensions the planned card's signals put under review: each lens names the rules a reviewer checks for it. */
    private static Set<QualityDimension> lens(List<Signal> signals) {
        return signals.stream().map(PriorFailures::dimensionOf).collect(Collectors.toSet());
    }

    private static QualityDimension dimensionOf(Signal signal) {
        return switch (signal) {
            case TOUCHES_AUTH_PERMISSIONS_OR_PERSONAL_DATA, TOUCHES_HOT_PATHS_OR_HEAVY_QUERIES ->
                QualityDimension.RUNTIME_GUARDRAILS;
            case TOUCHES_UI -> QualityDimension.UX_AND_POLISH;
            case TOUCHES_DATA_SCHEMA -> QualityDimension.CLEAN_CODE;
            case TOUCHES_INFRASTRUCTURE -> QualityDimension.ARCHITECTURE;
        };
    }

    private static String key(String value) {
        return value.toUpperCase(Locale.ROOT);
    }
}
