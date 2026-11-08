package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardLink;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.EscapedDefect;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.LineageContract;
import com.javadaba.contexts.officium.domain.LinkType;
import com.javadaba.contexts.officium.domain.QualityLineage;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.CardLinkRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.EscapedDefectRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * The quality lineage of corrective cards in {@code CardService} (card://JAVA-1525), kept out of it because the
 * service is at its size ceiling: the gate before a create or a move ({@link LineageContract}), and after it the
 * escaped-defect entry on the origin card, the {@code related} link between both, and the origin's history line.
 */
final class LineageRecorder {

    private static final Logger LOG = Logger.getLogger(LineageRecorder.class.getName());

    private final CardRepository cards;
    private final CardLinkRepository links;
    private final EscapedDefectRepository defects;
    private final ActivityPublisher activity;

    LineageRecorder(CardRepository cards, CardLinkRepository links, EscapedDefectRepository defects,
            ActivityPublisher activity) {
        this.cards = cards;
        this.links = links;
        this.defects = defects;
        this.activity = activity;
    }

    /** The gate: {@code key} is null on a creation, {@code from} too. */
    void require(UUID projectId, String key, Executor executor, Category category, String description, Status from,
            Status to, Actor actor) {
        LineageContract.require(actor.kind(), executor, category, from, to, description, key,
                origin -> liveCard(projectId, origin).isPresent());
    }

    /**
     * After the write, whoever made it: a corrective card that states a complete lineage naming another live card
     * logs the escaped defect on that origin, once per pair. Nothing for a move that is no checkpoint. The card's own
     * write already committed, so a failure here is logged, never answered as a failed write.
     */
    void record(Card card, Status from, Actor actor, Instant now) {
        try {
            write(card, from, actor, now);
        } catch (RuntimeException ex) {
            LOG.log(Level.WARNING, "The escaped defect named by " + card.key() + " was not kept", ex);
        }
    }

    private void write(Card card, Status from, Actor actor, Instant now) {
        if (!LineageContract.corrective(card.category()) || !LineageContract.checkpoint(from, card.status())) {
            return;
        }
        Optional<QualityLineage> lineage = QualityLineage.parse(card.description()).filter(QualityLineage::namesCard)
                .filter(named -> !named.causedBy().equals(card.key()));
        Optional<Card> origin = lineage.flatMap(named -> liveCard(card.projectId(), named.causedBy()));
        if (origin.isEmpty()) {
            return;
        }
        QualityLineage named = lineage.get();
        Card source = origin.get();
        if (!defects.recordIfAbsent(new EscapedDefect(UUID.randomUUID(), card.projectId(), source.id(), card.id(),
                card.key(), now, actor, named.escapedIn(), named.dimension(), named.rules()))) {
            return;
        }
        boolean linked = links.findByCard(card.id()).stream()
                .anyMatch(link -> link.sourceCardId().equals(source.id()) || link.targetCardId().equals(source.id()));
        if (!linked) {
            links.insert(new CardLink(UUID.randomUUID(), card.projectId(), LinkType.RELATED, card.id(), source.id(),
                    card.key(), source.key()));
        }
        activity.record(card.projectId(), source.id(), source.key(), actor, "card.escapedDefect",
                "A defect escaped its " + named.escapedIn().wire() + " (" + named.dimension().label().toLowerCase(
                        java.util.Locale.ROOT) + "): " + card.key() + " corrects it",
                now);
        activity.publish("card.updated", card.projectId(), source.id(), source.key(), source.version(), actor, now);
    }

    private Optional<Card> liveCard(UUID projectId, String key) {
        return cards.findByKey(projectId, key).filter(card -> !card.deleted());
    }
}
