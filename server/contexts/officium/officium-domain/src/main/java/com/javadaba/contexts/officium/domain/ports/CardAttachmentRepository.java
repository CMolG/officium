package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.CardAttachment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CardAttachmentRepository {

    CardAttachment insert(CardAttachment attachment);

    Optional<CardAttachment> findById(UUID cardId, UUID attachmentId);

    List<CardAttachment> listByCard(UUID cardId);

    void delete(UUID cardId, UUID attachmentId);
}
