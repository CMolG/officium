package com.javadaba.contexts.officium.application;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.javadaba.contexts.officium.application.github.DevLinkView;
import com.javadaba.contexts.officium.domain.CardComment;

import java.util.List;

/** {@code CardDetail = Card & {comments, timeEntries, attachments, development, epicChildren,
 *  epicChildrenOpen}} (contract §2), flattened onto the wire with {@code @JsonUnwrapped} so it reads exactly
 *  like {@link CardView} plus four extra arrays and two counts. {@code development} is the card's GitHub
 *  activity (JAVA-375, §8.10); {@code epicChildren} how many cards belong to an epic (JAVA-292) and
 *  {@code epicChildrenOpen} how many of those are not done yet (JAVA-379: a person moves an epic only once
 *  it is 0), both null for any other card. {@code form} is the Quaestio form a human card is answered
 *  with and what it was answered (JAVA-894), null for a card with none. {@code checkpoints} are an epic's cards in
 *  the order one session works them (card://JAVA-1876), null off an epic; their progress is the card's own
 *  {@code checkpointProgress}, which every view of an epic carries (card://JAVA-1873). */
public record CardDetailView(
        @JsonUnwrapped CardView card,
        List<CardComment> comments,
        List<TimeEntryView> timeEntries,
        List<AttachmentView> attachments,
        List<DevLinkView> development,
        Integer epicChildren,
        Integer epicChildrenOpen,
        CardFormView form,
        List<CheckpointView> checkpoints) {

    /** A card that is no epic, or a caller that predates checkpoints: none. */
    public CardDetailView(CardView card, List<CardComment> comments, List<TimeEntryView> timeEntries,
            List<AttachmentView> attachments, List<DevLinkView> development, Integer epicChildren,
            Integer epicChildrenOpen, CardFormView form) {
        this(card, comments, timeEntries, attachments, development, epicChildren, epicChildrenOpen, form, null);
    }
}
