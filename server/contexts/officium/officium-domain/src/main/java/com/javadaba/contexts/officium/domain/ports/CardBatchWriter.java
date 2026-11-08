package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardAttachment;
import com.javadaba.contexts.officium.domain.CardComment;
import com.javadaba.contexts.officium.domain.CardLink;

import java.util.List;

/**
 * Persists a whole batch of cards -- and whatever hangs off them -- in ONE transaction: what
 * {@code backlog.importMarkdown} and {@code cards.create}'s batch path need instead of the
 * one-row-at-a-time {@link CardRepository#insert}/{@link CardCommentRepository#insert}/
 * {@link CardAttachmentRepository#insert}/{@link CardLinkRepository#insert} loop each used to run.
 * A mid-batch failure rolls every list back together instead of leaving a half-imported project,
 * and the round trips drop from O(n) to a handful per list.
 *
 * <p>Cards go first: comments/attachments/links reference ids the cards already carry (client-
 * generated {@code UUID}s, never ones a database hands back), so the cards don't need to be
 * persisted first to know their ids -- only ordered first in the same transaction so a foreign key
 * never points at a row that isn't there yet.
 */
public interface CardBatchWriter {

    void insertAll(List<Card> cards, List<CardComment> comments, List<CardAttachment> attachments,
            List<CardLink> links);
}
