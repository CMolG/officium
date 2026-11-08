package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.CardComment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CardCommentRepository {

    CardComment insert(CardComment comment);

    Optional<CardComment> findById(UUID cardId, UUID commentId);

    List<CardComment> listByCard(UUID cardId);

    CardComment update(CardComment comment);

    void delete(UUID cardId, UUID commentId);
}
