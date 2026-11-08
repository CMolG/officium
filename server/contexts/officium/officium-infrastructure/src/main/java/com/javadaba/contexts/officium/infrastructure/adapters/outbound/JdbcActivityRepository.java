package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.ActivityEntry;
import com.javadaba.contexts.officium.domain.Page;
import com.javadaba.contexts.officium.domain.ports.ActivityRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.nio.charset.StandardCharsets;

@ApplicationScoped
public class JdbcActivityRepository implements ActivityRepository {

    private static final String SELECT = "select id, project_id, card_id, card_key, actor, operation, summary, at "
            + "from officium_activity";

    private final DataSource dataSource;

    public JdbcActivityRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public ActivityEntry insert(ActivityEntry entry) {
        String sql = "insert into officium_activity (id, project_id, card_id, card_key, actor, operation, summary, "
                + "at) values (?, ?, ?, ?, cast(? as jsonb), ?, ?, ?)";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, entry.id());
            statement.setObject(2, entry.projectId());
            statement.setObject(3, entry.cardId());
            statement.setString(4, entry.cardKey());
            statement.setString(5, OfficiumJson.writeActor(entry.actor()));
            statement.setString(6, entry.operation());
            statement.setString(7, entry.summary());
            statement.setTimestamp(8, Timestamp.from(entry.at()));
            statement.executeUpdate();
            return entry;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert activity entry", ex);
        }
    }

    @Override
    public Page<ActivityEntry> list(UUID projectId, UUID cardId, String cursor, int limit) {
        int offset = decodeCursor(cursor);
        StringBuilder sql = new StringBuilder(SELECT + " where project_id = ?");
        if (cardId != null) {
            sql.append(" and card_id = ?");
        }
        sql.append(" order by at desc, id desc limit ? offset ?");
        List<ActivityEntry> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql.toString())) {
            int idx = 1;
            statement.setObject(idx++, projectId);
            if (cardId != null) {
                statement.setObject(idx++, cardId);
            }
            statement.setInt(idx++, limit + 1);
            statement.setInt(idx, offset);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list activity for " + projectId, ex);
        }
        boolean hasMore = result.size() > limit;
        List<ActivityEntry> page = hasMore ? result.subList(0, limit) : result;
        return new Page<>(page, hasMore ? encodeCursor(offset + limit) : null);
    }

    @Override
    public List<ActivityEntry> listByOperation(UUID projectId, String operation) {
        List<ActivityEntry> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where project_id = ? and operation = ? order by at asc, id asc")) {
            statement.setObject(1, projectId);
            statement.setString(2, operation);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read " + operation + " activity of " + projectId, ex);
        }
        return result;
    }

    @Override
    public List<ActivityEntry> listByCard(UUID projectId, UUID cardId, String operation) {
        List<ActivityEntry> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where project_id = ? and card_id = ? and operation = ? order by at asc, id asc")) {
            statement.setObject(1, projectId);
            statement.setObject(2, cardId);
            statement.setString(3, operation);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read " + operation + " activity of card " + cardId, ex);
        }
        return result;
    }

    private static int decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return 0;
        }
        try {
            return Integer.parseInt(new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8));
        } catch (RuntimeException ex) {
            return 0;
        }
    }

    private static String encodeCursor(int offset) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(Integer.toString(offset).getBytes(StandardCharsets.UTF_8));
    }

    private static ActivityEntry map(ResultSet rs) throws SQLException {
        return new ActivityEntry(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                rs.getObject("card_id", UUID.class), rs.getString("card_key"),
                OfficiumJson.readActor(rs.getString("actor")), rs.getString("operation"), rs.getString("summary"),
                rs.getTimestamp("at").toInstant());
    }
}
