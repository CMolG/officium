package com.javadaba.contexts.officium.application.github;

import com.javadaba.contexts.officium.application.CardCommentService;
import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.application.CardVersionConflictException;
import com.javadaba.contexts.officium.application.DeployCloser;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.Status;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.DevLinkRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * What a merge into the default branch does to the cards it carries: the only automatic move is a card in
 * {@code deploy} going to {@code done} (JAVA-372). A commit reaching the default branch carries the cards it names;
 * a pull request merging carries every card its head branch's commits named (JAVA-1880), which is what a squash
 * merge with a prose body leaves no other trace of.
 */
@ApplicationScoped
public class GithubMerges {

    private final CardRepository cards;
    private final CardService cardService;
    private final CardCommentService comments;
    private final DevLinkRepository links;
    private final DeployCloser deploys;

    @Inject
    public GithubMerges(CardRepository cards, CardService cardService, CardCommentService comments,
            DevLinkRepository links, DeployCloser deploys) {
        this.cards = cards;
        this.cardService = cardService;
        this.comments = comments;
        this.links = links;
        this.deploys = deploys;
    }

    /**
     * A commit naming {@code named} reached the default branch: a card in {@code deploy} goes to {@code done}; any
     * other open card is only told, and a finished one is left alone.
     */
    Reached reachedDefaultBranch(Project project, Card named, GithubEvents.Commit commit, String defaultBranch,
            Actor actor) {
        String sha = "[`" + GithubService.shortSha(commit.sha()) + "`](" + commit.url() + ")";
        for (int attempt = 0; attempt < 2; attempt++) {
            Card card = cards.findById(project.id(), named.id()).orElse(named);
            if (card.status() == Status.DONE) {
                return Reached.UNTOUCHED;
            }
            if (card.status() != Status.DEPLOY) {
                comments.add(project.ownerAccountId(), project.id(), card.key(), "Reached `" + defaultBranch
                        + "` in " + sha + ". The card stays in " + card.status().wire() + ": only a card in deploy "
                        + "is closed by a merge, so review is never skipped.", actor);
                return Reached.TOLD;
            }
            try {
                cardService.move(project.ownerAccountId(), project.id(), card.id(), card.version(), Status.DONE, 0,
                        actor);
            } catch (CardVersionConflictException ex) {
                continue;
            }
            comments.add(project.ownerAccountId(), project.id(), card.key(), "Merged to `" + defaultBranch + "` in "
                    + sha + ": moved from deploy to done.", actor);
            return Reached.MOVED;
        }
        return Reached.LOST;
    }

    /**
     * A pull request merged into the default branch: its head branch's open links are marked merged, and the cards
     * among them still in {@code deploy} go to {@code done}. Answers the keys it moved; any other pull request event
     * moves nothing. The other cards on the branch are left alone, as a commit reaching main leaves them.
     */
    List<String> pullRequestMerged(Project project, GithubEvents.PullRequest pr, Instant now, Actor actor) {
        if (!pr.merged() || pr.headBranch().isBlank() || !pr.intoDefaultBranch()) {
            return List.of();
        }
        List<Card> carried = links.mergeBranch(project.id(), pr.repo(), pr.headBranch(), now).stream()
                .map(id -> cards.findById(project.id(), id)).flatMap(Optional::stream)
                .filter(card -> !card.deleted() && card.status() == Status.DEPLOY).toList();
        return deploys.close(project, carried, "Closed on merge: " + pr.url() + " merged `" + pr.headBranch()
                + "`, the branch that carried this card's commits.", actor);
    }
}
