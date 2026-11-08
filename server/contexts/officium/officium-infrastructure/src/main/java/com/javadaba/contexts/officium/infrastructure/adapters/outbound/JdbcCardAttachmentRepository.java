package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.CardAttachment;
import com.javadaba.contexts.officium.domain.ports.CardAttachmentRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JdbcCardAttachmentRepository implements CardAttachmentRepository {

    private static final String SELECT = "select id, card_id, name, size, content_type, path, created_at "
            + "from officium_card_attachment";

    private static final String INSERT_SQL = "insert into officium_card_attachment (id, card_id, name, size, "
            + "content_type, path, created_at) values (?, ?, ?, ?, ?, ?, ?)";

    private final DataSource dataSource;

    public JdbcCardAttachmentRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public CardAttachment insert(CardAttachment attachment) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(INSERT_SQL)) {
            bindInsert(statement, attachment);
            statement.executeUpdate();
            return attachment;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert attachment", ex);
        }
    }

    /** Caller-managed {@link Connection} so {@link JdbcCardBatchWriter} can run this in the same
     *  transaction as the card/comment/link batches. */
    void insertBatch(Connection connection, List<CardAttachment> attachmentsToInsert) throws SQLException {
        if (attachmentsToInsert.isEmpty()) {
            return;
        }
        try (PreparedStatement statement = connection.prepareStatement(INSERT_SQL)) {
            for (CardAttachment attachment : attachmentsToInsert) {
                bindInsert(statement, attachment);
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void bindInsert(PreparedStatement statement, CardAttachment attachment) throws SQLException {
        statement.setObject(1, attachment.id());
        statement.setObject(2, attachment.cardId());
        statement.setString(3, attachment.name());
        statement.setLong(4, attachment.size());
        statement.setString(5, attachment.contentType());
        statement.setString(6, attachment.path());
        statement.setTimestamp(7, Timestamp.from(attachment.createdAt()));
    }

    @Override
    public Optional<CardAttachment> findById(UUID cardId, UUID attachmentId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where card_id = ? and id = ?")) {
            statement.setObject(1, cardId);
            statement.setObject(2, attachmentId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to find attachment " + attachmentId, ex);
        }
    }

    @Override
    public List<CardAttachment> listByCard(UUID cardId) {
        List<CardAttachment> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where card_id = ? order by created_at")) {
            statement.setObject(1, cardId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list attachments for " + cardId, ex);
        }
        return result;
    }

    @Override
    public void delete(UUID cardId, UUID attachmentId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_card_attachment where card_id = ? and id = ?")) {
            statement.setObject(1, cardId);
            statement.setObject(2, attachmentId);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to delete attachment " + attachmentId, ex);
        }
    }

    private static CardAttachment map(ResultSet rs) throws SQLException {
        return new CardAttachment(rs.getObject("id", UUID.class), rs.getObject("card_id", UUID.class),
                rs.getString("name"), rs.getLong("size"), rs.getString("content_type"),
                rs.getString("path"), rs.getTimestamp("created_at").toInstant());
    }
}
