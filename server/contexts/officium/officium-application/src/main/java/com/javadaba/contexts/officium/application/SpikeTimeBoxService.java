package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.CategoryContracts;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Spike's Behavior "when the time box runs out, whatever exists is delivered" (JAVA-878): every expired spike
 * in progress goes to Ready, where the delivery analyst checks it against the exit contract. The move is made
 * as an agent on the project owner's account, the shape the GitHub and pipeline writers use, so it ends the run
 * like any agent's move out of In progress, and a comment says when the box started, how long it was and when
 * it ended.
 */
@ApplicationScoped
public class SpikeTimeBoxService {

    static final String AGENT_NAME = "Officium time box";

    private static final Logger LOG = Logger.getLogger(SpikeTimeBoxService.class.getName());

    private final CardService cards;
    private final CardCommentService comments;
    private final AgentWorkService work;

    public SpikeTimeBoxService(CardService cards, CardCommentService comments, AgentWorkService work) {
        this.cards = cards;
        this.comments = comments;
        this.work = work;
    }

    /** @return how many spikes were delivered; one that fails is logged and the rest still go. */
    public int deliverExpired() {
        int delivered = 0;
        for (CardService.ExpiredSpike spike : cards.expiredSpikes()) {
            Actor actor = Actor.agent(spike.ownerAccountId(), AGENT_NAME);
            try {
                Optional<CardView> moved = cards.deliverExpiredSpike(spike, actor);
                if (moved.isEmpty()) {
                    continue;
                }
                work.follow(spike.projectId(), moved.get(), actor, AgentWorkService.Signal.STOPS);
                comments.add(spike.ownerAccountId(), spike.projectId(), spike.key(),
                        CategoryContracts.timeBoxDelivered(spike.endsAt(), spike.timeBox()), actor);
                delivered++;
            } catch (RuntimeException failed) {
                LOG.log(Level.WARNING, "Spike " + spike.key() + " not delivered by its time box", failed);
            }
        }
        return delivered;
    }
}
