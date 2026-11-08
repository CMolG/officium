package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardTimeEntry;
import com.javadaba.contexts.officium.domain.DeliveryFlow;
import com.javadaba.contexts.officium.domain.TimeConcept;
import com.javadaba.contexts.officium.domain.TimeSource;
import com.javadaba.contexts.officium.domain.TimeSplit;
import com.javadaba.contexts.officium.domain.TokenUsage;
import com.javadaba.contexts.officium.domain.ports.ActivityRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Turns a span an agent spent on a card into time entries (JAVA-245, contract §8.4), the same way
 * whether the span came from a run or from a session its harness reported: one entry per UTC day
 * and per concept, refinement while the card sat in refine, tokens spread by time.
 */
@ApplicationScoped
public class ImputedTime {

    private final ActivityRepository activity;

    public ImputedTime(ActivityRepository activity) {
        this.activity = activity;
    }

    /** When the card sat in refine, read from its moves. */
    public List<TimeSplit.Interval> refineOf(Card card) {
        List<DeliveryFlow.Move> moves = activity.listByOperation(card.projectId(), "card.moved").stream()
                .map(DeliveryFlow::moveOf).flatMap(Optional::stream)
                .filter(move -> move.cardId().equals(card.id()))
                .toList();
        return TimeSplit.refineIntervals(moves, card.status());
    }

    /** The entries for {@code span}. Hours are rounded to the hundredth; a piece that rounds to nothing
     *  is dropped unless it carries tokens, which then still have an entry to live on. */
    public static List<CardTimeEntry> entries(Span span, List<TimeSplit.Interval> refine, Instant now) {
        List<TimeSplit.Piece> pieces = TimeSplit.pieces(span.start(), span.end(), refine, span.concept());
        List<TokenUsage> tokens = span.tokens() == null ? null : TimeSplit.apportion(span.tokens(), pieces);
        List<CardTimeEntry> result = new ArrayList<>();
        for (int i = 0; i < pieces.size(); i++) {
            TimeSplit.Piece piece = pieces.get(i);
            double hours = Math.round(piece.hours() * 100) / 100.0;
            TokenUsage share = tokens == null ? null : tokens.get(i);
            if (hours <= 0 && (share == null || share.isZero() || span.source() != TimeSource.AGENT_SESSION)) {
                continue;
            }
            result.add(new CardTimeEntry(UUID.randomUUID(), span.cardId(), piece.date(), hours, span.who(), null,
                    span.note(), now, span.source(), piece.concept(), span.model(), span.effort(), share, piece.start(),
                    piece.end(),
                    span.sessionRef(), span.subagent()));
        }
        return result;
    }

    /** What an agent spent on a card between {@code start} and {@code end}; the session fields are null
     *  for a run. A null {@code concept} is derived from the card's moves. */
    public record Span(UUID cardId, Instant start, Instant end, String who, String note, TimeSource source,
            String model, String effort, TokenUsage tokens, String sessionRef, String subagent, TimeConcept concept) {
    }
}
