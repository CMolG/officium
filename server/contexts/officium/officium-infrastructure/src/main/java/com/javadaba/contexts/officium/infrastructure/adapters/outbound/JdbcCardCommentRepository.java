package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.CardComment;
import com.javadaba.contexts.officium.domain.ports.CardCommentRepository;
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
public class JdbcCardCommentRepository implements CardCommentRepository {

    private static final String SELECT = "select id, card_id, author, text, created_at, updated_at, parent_id "
            + "from officium_card_comment";

    private static final String INSERT_SQL = "insert into officium_card_comment (id, card_id, author, text, "
            + "created_at, updated_at, parent_id) values (?, ?, cast(? as jsonb), ?, ?, ?, ?)";

    private final DataSource dataSource;

    public JdbcCardCommentRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public CardComment insert(CardComment comment) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(INSERT_SQL)) {
            bindInsert(statement, comment);
            statement.executeUpdate();
            return comment;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert comment", ex);
        }
    }

    /** Caller-managed {@link Connection} so {@link JdbcCardBatchWriter} can run this in the same
     *  transaction as the card/attachment/link batches. */
    static void insertBatch(Connection connection, List<CardComment> commentsToInsert) throws SQLException {
        if (commentsToInsert.isEmpty()) {
            return;
        }
        try (PreparedStatement statement = connection.prepareStatement(INSERT_SQL)) {
            for (CardComment comment : commentsToInsert) {
                bindInsert(statement, comment);
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void bindInsert(PreparedStatement statement, CardComment comment) throws SQLException {
        statement.setObject(1, comment.id());
        statement.setObject(2, comment.cardId());
        statement.setString(3, OfficiumJson.writeActor(comment.author()));
        statement.setString(4, comment.text());
        statement.setTimestamp(5, Timestamp.from(comment.createdAt()));
        statement.setTimestamp(6, Timestamp.from(comment.updatedAt()));
        statement.setObject(7, comment.parentId());
    }

    @Override
    public Optional<CardComment> findById(UUID cardId, UUID commentId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where card_id = ? and id = ?")) {
            statement.setObject(1, cardId);
            statement.setObject(2, commentId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to find comment " + commentId, ex);
        }
    }

    @Override
    public List<CardComment> listByCard(UUID cardId) {
        List<CardComment> result = new ArrayList<>();
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
            throw new IllegalStateException("Unable to list comments for " + cardId, ex);
        }
        return result;
    }

    @Override
    public CardComment update(CardComment comment) {
        String sql = "update officium_card_comment set text = ?, updated_at = ? where id = ? and card_id = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, comment.text());
            statement.setTimestamp(2, Timestamp.from(comment.updatedAt()));
            statement.setObject(3, comment.id());
            statement.setObject(4, comment.cardId());
            statement.executeUpdate();
            return comment;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to update comment " + comment.id(), ex);
        }
    }

    @Override
    public void delete(UUID cardId, UUID commentId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_card_comment where card_id = ? and id = ?")) {
            statement.setObject(1, cardId);
            statement.setObject(2, commentId);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to delete comment " + commentId, ex);
        }
    }

    private static CardComment map(ResultSet rs) throws SQLException {
        return new CardComment(rs.getObject("id", UUID.class), rs.getObject("card_id", UUID.class),
                OfficiumJson.readActor(rs.getString("author")), rs.getString("text"),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant(),
                rs.getObject("parent_id", UUID.class));
    }
}
