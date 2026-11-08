package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.QueuedCard;
import com.javadaba.contexts.officium.domain.ports.SessionQueueRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** {@code officium_session_queue} (JAVA-561, changeset {@code officium/017}). */
@ApplicationScoped
public class JdbcSessionQueueRepository implements SessionQueueRepository {

    private static final String COLUMNS = "card_id, card_key, project_id, account_id, session_id, position, queued_at, delivered_at";

    private final DataSource dataSource;

    public JdbcSessionQueueRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public QueuedCard enqueue(UUID cardId, String cardKey, UUID projectId, UUID accountId, String sessionId,
            Instant at) {
        // The position is read in the same statement, so two cards queued at once into one session
        // can at worst tie, and a tie still keeps both in the queue.
        String sql = "insert into officium_session_queue (" + COLUMNS + ") values (?, ?, ?, ?, ?, "
                + "(select coalesce(max(position), 0) + 1 from officium_session_queue "
                + "where account_id = ? and session_id = ? and card_id <> ?), ?, null) "
                + "on conflict (card_id) do update set card_key = excluded.card_key, "
                + "project_id = excluded.project_id, account_id = excluded.account_id, "
                + "session_id = excluded.session_id, position = excluded.position, "
                + "queued_at = excluded.queued_at, delivered_at = null returning " + COLUMNS;
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, cardId);
            statement.setString(2, cardKey);
            statement.setObject(3, projectId);
            statement.setObject(4, accountId);
            statement.setString(5, sessionId);
            statement.setObject(6, accountId);
            statement.setString(7, sessionId);
            statement.setObject(8, cardId);
            statement.setTimestamp(9, Timestamp.from(at));
            try (ResultSet rs = statement.executeQuery()) {
                rs.next();
                return map(rs);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to queue card " + cardId, ex);
        }
    }

    @Override
    public Optional<QueuedCard> find(UUID cardId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select " + COLUMNS + " from officium_session_queue where card_id = ?")) {
            statement.setObject(1, cardId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the queue entry of card " + cardId, ex);
        }
    }

    @Override
    public boolean remove(UUID cardId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_session_queue where card_id = ?")) {
            statement.setObject(1, cardId);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to unqueue card " + cardId, ex);
        }
    }

    @Override
    public List<QueuedCard> ofAccount(UUID accountId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement("select " + COLUMNS
                        + " from officium_session_queue where account_id = ? order by session_id, position, queued_at")) {
            statement.setObject(1, accountId);
            try (ResultSet rs = statement.executeQuery()) {
                List<QueuedCard> entries = new ArrayList<>();
                while (rs.next()) {
                    entries.add(map(rs));
                }
                return entries;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the session queues of " + accountId, ex);
        }
    }

    @Override
    public Optional<QueuedCard> lease(UUID accountId, String sessionId, Instant now, Instant staleBefore) {
        String sql = "update officium_session_queue set delivered_at = ? where card_id = ("
                + "select card_id from officium_session_queue where account_id = ? and session_id = ? "
                + "and (delivered_at is null or delivered_at < ?) order by position, queued_at limit 1 "
                + "for update skip locked) returning " + COLUMNS;
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setTimestamp(1, Timestamp.from(now));
            statement.setObject(2, accountId);
            statement.setString(3, sessionId);
            statement.setTimestamp(4, Timestamp.from(staleBefore));
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to hand out a card of session " + sessionId, ex);
        }
    }

    @Override
    public boolean confirm(UUID accountId, String sessionId, UUID cardId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_session_queue where card_id = ? and account_id = ? and session_id = ? "
                                + "and delivered_at is not null")) {
            statement.setObject(1, cardId);
            statement.setObject(2, accountId);
            statement.setString(3, sessionId);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to confirm card " + cardId, ex);
        }
    }

    private static QueuedCard map(ResultSet rs) throws SQLException {
        Timestamp delivered = rs.getTimestamp("delivered_at");
        return new QueuedCard(rs.getObject("card_id", UUID.class), rs.getString("card_key"),
                rs.getObject("project_id", UUID.class), rs.getObject("account_id", UUID.class),
                rs.getString("session_id"), rs.getLong("position"), rs.getTimestamp("queued_at").toInstant(),
                delivered == null ? null : delivered.toInstant());
    }
}
