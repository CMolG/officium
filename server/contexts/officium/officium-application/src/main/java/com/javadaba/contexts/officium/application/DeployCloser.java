package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * A merge into main closes the Deploy cards it carries (card://JAVA-1584, owner, 2026-10-18). Merging is this
 * project's deploy decision, so the merge is the evidence for Completed; on 2026-10-18, 156 cards sat in Deploy
 * already merged, some for weeks, because closing them was left to agents nobody pointed at it.
 */
@ApplicationScoped
public class DeployCloser {

    private static final Logger LOG = Logger.getLogger(DeployCloser.class);

    private final CardRepository cards;
    private final CardService cardService;
    private final CardCommentService comments;

    @Inject
    public DeployCloser(CardRepository cards, CardService cardService, CardCommentService comments) {
        this.cards = cards;
        this.cardService = cardService;
        this.comments = comments;
    }

    /** Moves to done every Deploy card {@code message} names, each with a comment naming the merge. */
    public void closeCarried(Project project, String ref, String url, String message, Actor actor) {
        close(project, carried(cards.findAllByProject(project.id()), message), "Closed on merge: "
                + (url == null || url.isBlank() ? ref : url) + " reached main and carries this card's key.", actor);
    }

    /** Moves each of {@code deploy} to done with {@code evidence} as its comment; answers the keys it moved. */
    public List<String> close(Project project, List<Card> deploy, String evidence, Actor actor) {
        List<String> moved = new ArrayList<>();
        for (Card card : deploy) {
            try {
                cardService.move(project.ownerAccountId(), project.id(), card.id(), card.version(), Status.DONE, 0,
                        null, null, null, null, actor);
                comments.add(project.ownerAccountId(), project.id(), card.key(), evidence, actor);
                moved.add(card.key());
            } catch (OfficiumException ex) {
                // A contract the card still misses keeps it in Deploy, where a person sees why.
                LOG.warnf("%s stays in Deploy after a merge: %s", card.key(), ex.getMessage());
            }
        }
        return moved;
    }

    /** The live cards in Deploy whose key {@code message} names, never as part of a longer number. */
    static List<Card> carried(List<Card> all, String message) {
        if (message == null || message.isBlank()) {
            return List.of();
        }
        return all.stream()
                .filter(card -> !card.deleted() && card.status() == Status.DEPLOY)
                .filter(card -> Pattern.compile("(?<![A-Za-z0-9-])" + Pattern.quote(card.key()) + "(?![0-9])")
                        .matcher(message).find())
                .toList();
    }
}
