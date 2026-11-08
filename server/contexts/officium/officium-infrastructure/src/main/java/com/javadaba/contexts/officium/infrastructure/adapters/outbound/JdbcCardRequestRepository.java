package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.CardRequest;
import com.javadaba.contexts.officium.domain.ports.CardRequestRepository;
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

@ApplicationScoped
public class JdbcCardRequestRepository implements CardRequestRepository {

    private static final String SELECT = "select id, project_id, card_id, action, detail, why, status, "
            + "created_by::text as created_by, created_at, answered_by::text as answered_by, answered_at, note, "
            + "closed_at from officium_card_request";

    private final DataSource dataSource;

    public JdbcCardRequestRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public boolean insert(CardRequest request) {
        String sql = "insert into officium_card_request (id, project_id, card_id, action, detail, why, status, "
                + "created_by, created_at) values (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?) "
                + "on conflict (card_id) where status <> 'closed' do nothing";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, request.id());
            statement.setObject(2, request.projectId());
            statement.setObject(3, request.cardId());
            statement.setString(4, request.action());
            statement.setString(5, request.detail());
            statement.setString(6, request.why());
            statement.setString(7, request.status().wire());
            statement.setString(8, OfficiumJson.writeActor(request.createdBy()));
            statement.setTimestamp(9, Timestamp.from(request.createdAt()));
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert a request on card " + request.cardId(), ex);
        }
    }

    @Override
    public Optional<CardRequest> find(UUID requestId) {
        List<CardRequest> found = query(SELECT + " where id = ?", requestId);
        return found.isEmpty() ? Optional.empty() : Optional.of(found.get(0));
    }

    @Override
    public List<CardRequest> live(UUID projectId) {
        return query(SELECT + " where project_id = ? and status <> 'closed' and card_id in (select id from "
                + "officium_card where project_id = ? and deleted_at is null) order by created_at, id", projectId,
                projectId);
    }

    @Override
    public boolean answer(UUID requestId, CardRequest.Status answer, Actor answeredBy, String note, Instant at) {
        return update("update officium_card_request set status = ?, answered_by = ?::jsonb, answered_at = ?, "
                + "note = ? where id = ? and status = 'open'", answer.wire(), OfficiumJson.writeActor(answeredBy),
                Timestamp.from(at), note, requestId);
    }

    @Override
    public void closeForCard(UUID cardId, Instant at) {
        update("update officium_card_request set status = 'closed', closed_at = ? "
                + "where card_id = ? and status <> 'closed'", Timestamp.from(at), cardId);
    }

    @Override
    public boolean close(UUID requestId, Instant at) {
        return update("update officium_card_request set status = 'closed', closed_at = ? "
                + "where id = ? and status <> 'closed'", Timestamp.from(at), requestId);
    }

    private boolean update(String sql, Object... params) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                statement.setObject(i + 1, params[i]);
            }
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to update a card request", ex);
        }
    }

    private List<CardRequest> query(String sql, Object... params) {
        List<CardRequest> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                statement.setObject(i + 1, params[i]);
            }
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(read(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read card requests", ex);
        }
        return result;
    }

    private static CardRequest read(ResultSet rs) throws SQLException {
        String answeredBy = rs.getString("answered_by");
        return new CardRequest(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                rs.getObject("card_id", UUID.class), rs.getString("action"), rs.getString("detail"),
                rs.getString("why"), CardRequest.Status.fromWire(rs.getString("status")),
                OfficiumJson.readActor(rs.getString("created_by")), instant(rs, "created_at"),
                answeredBy == null ? null : OfficiumJson.readActor(answeredBy), instant(rs, "answered_at"),
                rs.getString("note"), instant(rs, "closed_at"));
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }
}
