package com.javadaba.contexts.officium.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Unattended hours (card://JAVA-1047): the part of an agent's span that no attended span overlaps,
 * such as the night a loop ran while nobody had a window open. Attended spans are the windows a
 * person was at the keyboard; overlapping windows count once.
 */
public final class UnattendedHours {

    /** A span of time; {@code end} is never before {@code start}. */
    public record Span(Instant start, Instant end) {

        public Span {
            if (start == null || end == null || end.isBefore(start)) {
                throw new IllegalArgumentException("a span ends at or after it starts");
            }
        }

        public Duration length() {
            return Duration.between(start, end);
        }
    }

    private UnattendedHours() {
    }

    /** How much of {@code agent} no span in {@code attended} covers. */
    public static Duration of(Span agent, List<Span> attended) {
        List<Span> inside = attended.stream()
                .map(a -> clip(a, agent))
                .flatMap(Optional::stream)
                .sorted((a, b) -> a.start().compareTo(b.start()))
                .toList();
        Duration covered = Duration.ZERO;
        Instant reached = null;
        for (Span span : inside) {
            Instant from = reached == null || span.start().isAfter(reached) ? span.start() : reached;
            if (span.end().isAfter(from)) {
                covered = covered.plus(Duration.between(from, span.end()));
                reached = span.end();
            }
        }
        return agent.length().minus(covered);
    }

    /** The part of {@code span} inside {@code window}, empty when they do not meet. */
    private static Optional<Span> clip(Span span, Span window) {
        Instant start = span.start().isAfter(window.start()) ? span.start() : window.start();
        Instant end = span.end().isBefore(window.end()) ? span.end() : window.end();
        return start.isBefore(end) ? Optional.of(new Span(start, end)) : Optional.empty();
    }
}
