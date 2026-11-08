package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.SessionOverhead;
import com.javadaba.contexts.officium.domain.TokenUsage;
import com.javadaba.contexts.officium.domain.ports.SessionOverheadRepository;
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
import java.util.UUID;

/** card://JAVA-1047: the overhead table, one row per track of a session that no card picked up. */
@ApplicationScoped
public class JdbcSessionOverheadRepository implements SessionOverheadRepository {

    private static final String COLUMNS = "id, project_id, account_id, session_ref, subagent, model, effort, "
            + "started_at, ended_at, tokens_in, cached_tokens_in, reasoning_tokens, tokens_out, attended, "
            + "cache_write_5m_tokens, cache_write_1h_tokens";

    private final DataSource dataSource;

    public JdbcSessionOverheadRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void insert(SessionOverhead row) {
        String sql = "insert into officium_session_overhead (" + COLUMNS + ") "
                + "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, row.id());
            statement.setObject(2, row.projectId());
            statement.setObject(3, row.accountId());
            statement.setString(4, row.sessionRef());
            statement.setString(5, row.subagent());
            statement.setString(6, row.model());
            statement.setString(7, row.effort());
            statement.setTimestamp(8, timestamp(row.startedAt()));
            statement.setTimestamp(9, timestamp(row.endedAt()));
            statement.setLong(10, row.tokens().tokensIn());
            statement.setLong(11, row.tokens().cachedTokensIn());
            statement.setLong(12, row.tokens().reasoningTokens());
            statement.setLong(13, row.tokens().tokensOut());
            statement.setObject(14, row.attended());
            statement.setLong(15, row.tokens().cacheWrite5mTokens());
            statement.setLong(16, row.tokens().cacheWrite1hTokens());
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert overhead of session " + row.sessionRef(), ex);
        }
    }

    @Override
    public void deleteBySession(String sessionRef) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_session_overhead where session_ref = ?")) {
            statement.setString(1, sessionRef);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to replace the overhead of session " + sessionRef, ex);
        }
    }

    @Override
    public List<SessionOverhead> listByProjectAndRange(UUID projectId, Instant from, Instant to) {
        List<SessionOverhead> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement("select " + COLUMNS
                        + " from officium_session_overhead where project_id = ? and started_at >= ? and started_at < ?"
                        + " order by started_at")) {
            statement.setObject(1, projectId);
            statement.setTimestamp(2, Timestamp.from(from));
            statement.setTimestamp(3, Timestamp.from(to));
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the overhead of " + projectId, ex);
        }
        return result;
    }

    private static SessionOverhead map(ResultSet rs) throws SQLException {
        return new SessionOverhead(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                rs.getObject("account_id", UUID.class), rs.getString("session_ref"), rs.getString("subagent"),
                rs.getString("model"), rs.getString("effort"), instant(rs, "started_at"), instant(rs, "ended_at"),
                new TokenUsage(rs.getLong("tokens_in"), rs.getLong("cached_tokens_in"),
                        rs.getLong("reasoning_tokens"), rs.getLong("tokens_out"), rs.getLong("cache_write_5m_tokens"),
                        rs.getLong("cache_write_1h_tokens")),
                rs.getObject("attended", Boolean.class));
    }

    private static Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }
}
