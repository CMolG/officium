package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.CardForm;
import com.javadaba.contexts.officium.domain.CardFormAnswer;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CardFormRepository {

    /** One form per card: {@code false} when the card already has one (nothing is written). */
    boolean insert(CardForm form);

    Optional<CardForm> findByCard(UUID cardId);

    Optional<CardForm> findByFormId(UUID formId);

    /** The questions each of these cards' form asks, for the cards that have one; one query for the lot. */
    java.util.Map<UUID, Integer> questionCounts(java.util.Collection<UUID> cardIds);

    void setQuestionCount(UUID cardFormId, int questionCount);

    /** {@code false} when this response was already recorded: a retry is not a second answer. */
    boolean insertAnswer(CardFormAnswer answer);

    /** Every answer the card's form took, oldest first. */
    List<CardFormAnswer> answers(UUID cardFormId);
}
