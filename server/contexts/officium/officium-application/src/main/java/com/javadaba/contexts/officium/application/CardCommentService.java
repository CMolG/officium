package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardComment;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.StorageUsage;
import com.javadaba.contexts.officium.domain.ports.CardCommentRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Comments bump the card's {@code version} too (contract §2: "the board's version is a single
 * freshness signal") -- done through {@code CardService}'s optimistic path isn't needed here since
 * a comment carries no {@code expectedVersion} of its own in the contract; it just re-stamps
 * {@code updated_at}/{@code version} on the card as a side effect.
 */
@ApplicationScoped
public class CardCommentService {

    private final CardCommentRepository comments;
    private final CardRepository cards;
    private final ProjectAccessGuard guard;
    private final CardService cardService;
    private final ActivityPublisher activity;
    private final StorageQuotaService quota;
    private final Clock clock;

    @Inject
    public CardCommentService(CardCommentRepository comments, CardRepository cards, ProjectAccessGuard guard,
            CardService cardService, ActivityPublisher activity, StorageQuotaService quota) {
        this(comments, cards, guard, cardService, activity, quota, Clock.systemUTC());
    }

    CardCommentService(CardCommentRepository comments, CardRepository cards, ProjectAccessGuard guard,
            CardService cardService, ActivityPublisher activity, StorageQuotaService quota, Clock clock) {
        this.comments = comments;
        this.cards = cards;
        this.guard = guard;
        this.cardService = cardService;
        this.activity = activity;
        this.quota = quota;
        this.clock = clock;
    }

    public List<CardComment> list(UUID accountId, UUID projectId, String keyOrId) {
        UUID cardId = cardService.resolveCardId(accountId, projectId, keyOrId);
        return comments.listByCard(cardId);
    }

    public CardComment add(UUID accountId, UUID projectId, String keyOrId, String text, Actor actor) {
        return add(accountId, projectId, keyOrId, text, null, actor);
    }

    /** {@code parentId}: the comment this one replies to (JAVA-524), null for a top-level comment. It
     *  must be a comment of the same card, so a thread never spans two cards. */
    public CardComment add(UUID accountId, UUID projectId, String keyOrId, String text, UUID parentId,
            Actor actor) {
        var access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        UUID cardId = cardService.resolveCardId(accountId, projectId, keyOrId);
        requireText(text);
        if (parentId != null && comments.findById(cardId, parentId).isEmpty()) {
            throw OfficiumException.badRequest("parent_comment_not_found",
                    "The comment being replied to is not on this card");
        }
        quota.requireRoom(access.project(), StorageUsage.bytesOf(text.strip()));
        Instant now = Instant.now(clock);
        CardComment saved = comments.insert(
                new CardComment(UUID.randomUUID(), cardId, actor, text.strip(), now, now, parentId));
        // A person's comment is a person adding to what the card says: the agent must see it.
        touchCard(projectId, cardId, actor, true);
        activity.record(projectId, cardId, cardKey(projectId, cardId), actor, "card.comment",
                parentId == null ? "Comment added" : "Reply added", now);
        activity.publish("card.comment", projectId, cardId, cardKey(projectId, cardId), null, actor, now);
        return saved;
    }

    public CardComment edit(UUID accountId, UUID projectId, String keyOrId, UUID commentId, String text,
            Actor actor) {
        var access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        UUID cardId = cardService.resolveCardId(accountId, projectId, keyOrId);
        requireText(text);
        CardComment existing = comments.findById(cardId, commentId)
                .orElseThrow(() -> OfficiumException.notFound("comment_not_found", "No such comment"));
        // Saving the same words is not an edit (user request, 2026-09-23): nothing is written.
        if (existing.text().equals(text.strip())) {
            return existing;
        }
        quota.requireRoom(access.project(), StorageUsage.bytesOf(text.strip()) - StorageUsage.bytesOf(existing.text()));
        CardComment updated = new CardComment(existing.id(), cardId, existing.author(), text.strip(),
                existing.createdAt(), Instant.now(clock), existing.parentId());
        CardComment saved = comments.update(updated);
        touchCard(projectId, cardId, actor, true);
        return saved;
    }

    public void delete(UUID accountId, UUID projectId, String keyOrId, UUID commentId, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        UUID cardId = cardService.resolveCardId(accountId, projectId, keyOrId);
        comments.findById(cardId, commentId)
                .orElseThrow(() -> OfficiumException.notFound("comment_not_found", "No such comment"));
        comments.delete(cardId, commentId);
        touchCard(projectId, cardId, actor, false);
    }

    private void requireText(String text) {
        if (text == null || text.isBlank()) {
            throw OfficiumException.badRequest("text_required", "A comment needs text");
        }
    }

    /** {@code addsContent}: a person writing here counts as a human edit of the card. */
    private void touchCard(UUID projectId, UUID cardId, Actor actor, boolean addsContent) {
        Card current = cards.findById(projectId, cardId).orElse(null);
        if (current == null) {
            return;
        }
        Instant now = Instant.now(clock);
        Card touched = addsContent ? current.editedBy(actor, now) : current.touched(actor, now);
        cards.updateIfVersion(touched, current.version());
        cardService.reindex(touched);
    }

    private String cardKey(UUID projectId, UUID cardId) {
        return cards.findById(projectId, cardId).map(Card::key).orElse(null);
    }
}
