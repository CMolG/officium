package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardAttachment;
import com.javadaba.contexts.officium.domain.CardComment;
import com.javadaba.contexts.officium.domain.CardLink;
import com.javadaba.contexts.officium.domain.ports.CardBatchWriter;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

/**
 * The one-transaction side of {@link CardBatchWriter}: a single {@link Connection}, autocommit
 * off, handed to each Jdbc*Repository's own package-private {@code insertBatch(Connection, List)}
 * in card-first order (comments/attachments/links reference a card's id), committed once, rolled
 * back on any failure. Every other method of those four repositories keeps opening and closing its
 * own connection -- this class only adds the cross-repository transaction none of them can open on
 * their own.
 */
@ApplicationScoped
public class JdbcCardBatchWriter implements CardBatchWriter {

    private final DataSource dataSource;
    private final JdbcCardRepository cardRepository;
    private final JdbcCardCommentRepository commentRepository;
    private final JdbcCardAttachmentRepository attachmentRepository;
    private final JdbcCardLinkRepository linkRepository;

    @Inject
    public JdbcCardBatchWriter(DataSource dataSource, JdbcCardRepository cardRepository,
            JdbcCardCommentRepository commentRepository, JdbcCardAttachmentRepository attachmentRepository,
            JdbcCardLinkRepository linkRepository) {
        this.dataSource = dataSource;
        this.cardRepository = cardRepository;
        this.commentRepository = commentRepository;
        this.attachmentRepository = attachmentRepository;
        this.linkRepository = linkRepository;
    }

    @Override
    public void insertAll(List<Card> cards, List<CardComment> comments, List<CardAttachment> attachments,
            List<CardLink> links) {
        if (cards.isEmpty() && comments.isEmpty() && attachments.isEmpty() && links.isEmpty()) {
            return;
        }
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                cardRepository.insertBatch(connection, cards);
                commentRepository.insertBatch(connection, comments);
                attachmentRepository.insertBatch(connection, attachments);
                linkRepository.insertBatch(connection, links);
                connection.commit();
            } catch (SQLException | RuntimeException ex) {
                connection.rollback();
                throw ex;
            } finally {
                connection.setAutoCommit(true);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to batch-write cards", ex);
        }
    }
}
