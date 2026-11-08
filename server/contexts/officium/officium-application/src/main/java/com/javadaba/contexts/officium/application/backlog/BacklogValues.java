package com.javadaba.contexts.officium.application.backlog;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardRejection;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.RejectionReason;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.Status;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;

/**
 * The values of an imported card that are read leniently: one the tree does not know is left out
 * or defaulted with a warning, because one bad value must not refuse the whole backlog. And the
 * rejection a card carries both ways (card://JAVA-1415).
 */
final class BacklogValues {

    static final String NO_NOTE = "Imported as rejected with no reason recorded";

    private BacklogValues() {
    }

    /** An unknown category is left empty with a warning, like a file the parser can't read. */
    static Category categoryOf(BacklogCard raw, List<String> warnings) {
        if (raw.category() == null || raw.category().isBlank()) {
            return null;
        }
        try {
            return Category.fromWire(raw.category());
        } catch (OfficiumException unknown) {
            warnings.add(raw.taskId() + ": unknown category " + raw.category() + ", left empty");
            return null;
        }
    }

    /** Same leniency as the category: an unknown signal is dropped with a warning, the rest are kept. */
    static List<Signal> signalsOf(BacklogCard raw, List<String> warnings) {
        List<Signal> signals = new ArrayList<>();
        for (String wire : raw.signals()) {
            try {
                signals.add(Signal.fromWire(wire));
            } catch (OfficiumException unknown) {
                warnings.add(raw.taskId() + ": unknown signal " + wire + ", left out");
            }
        }
        return signals;
    }

    /**
     * {@code card} with the rejection its file records, when it is rejected. A rejected file with no
     * reason, or one the tree does not know, is imported as {@code other} with {@link #NO_NOTE} when it
     * has no note either; a named card that is neither in the import nor in the project is left out.
     * Each of those leaves a warning.
     *
     * @param namedCard a key to the id of the card it names: one of this import, or a live one of the project
     */
    static Card rejected(Card card, BacklogCard.Rejection raw, Function<String, Optional<UUID>> namedCard,
            List<String> warnings) {
        if (card.status() != Status.REJECTED) {
            return card;
        }
        String wire = raw == null ? "" : raw.reason();
        RejectionReason reason = RejectionReason.OTHER;
        try {
            reason = RejectionReason.fromWire(wire);
        } catch (OfficiumException unknown) {
            warnings.add(card.key() + ": rejected " + (wire.isBlank() ? "with no reason" : "as unknown " + wire)
                    + ", imported as other");
        }
        String note = raw == null || raw.note().isBlank() ? NO_NOTE : raw.note();
        UUID named = null;
        if (raw != null && !raw.card().isBlank()) {
            named = namedCard.apply(raw.card()).orElse(null);
            if (named == null) {
                warnings.add(card.key() + ": rejection names unknown card " + raw.card() + ", left out");
            }
        }
        return new Card(card.id(), card.projectId(), card.key(), card.number(), card.title(), card.description(),
                card.actionPlan(), card.status(), card.runState(), card.priority(), card.executor(), card.category(),
                card.order(), card.estimate(), card.epic(), card.tags(), card.assignees(), card.version(),
                card.createdAt(), card.updatedAt(), card.createdBy(), card.updatedBy(), card.deletedAt(),
                card.clientKey(), card.humanEdit(), card.sprintId(), card.rank(), card.signals(), card.subtype(),
                new CardRejection(reason, note, named));
    }

    /** What a rejected card's file records; null for every other card. */
    static BacklogCard.Rejection exported(Card card, Function<UUID, Optional<Card>> byId) {
        CardRejection rejection = card.rejection();
        if (rejection == null) {
            return null;
        }
        String named = rejection.cardId() == null ? "" : byId.apply(rejection.cardId()).map(Card::key).orElse("");
        return new BacklogCard.Rejection(rejection.reason().wire(), rejection.note(), named);
    }
}
