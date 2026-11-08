package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.HeartbeatToken;
import com.javadaba.contexts.officium.domain.ports.HeartbeatTokenRepository;
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
public class JdbcHeartbeatTokenRepository implements HeartbeatTokenRepository {

    /** One round trip per beat: the lookup, and the minute-resolution stamp when it is due. */
    private static final String RESOLVE = """
            with hit as (
              select id, account_id, last_used_at from officium_heartbeat_token where token_hash = ?
            ), stamped as (
              update officium_heartbeat_token t set last_used_at = ?
                from hit
               where t.id = hit.id and (hit.last_used_at is null or hit.last_used_at < ?)
            )
            select account_id from hit""";

    private final DataSource dataSource;

    public JdbcHeartbeatTokenRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<HeartbeatToken> list(UUID accountId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select id, token_hash, machine, created_at, last_used_at from officium_heartbeat_token "
                                + "where account_id = ? order by coalesce(last_used_at, created_at) desc, id")) {
            statement.setObject(1, accountId);
            try (ResultSet rs = statement.executeQuery()) {
                List<HeartbeatToken> tokens = new ArrayList<>();
                while (rs.next()) {
                    Timestamp lastUsed = rs.getTimestamp("last_used_at");
                    tokens.add(new HeartbeatToken(rs.getObject("id", UUID.class), accountId,
                            rs.getString("token_hash"), rs.getString("machine"),
                            rs.getTimestamp("created_at").toInstant(), lastUsed == null ? null : lastUsed.toInstant()));
                }
                return tokens;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the heartbeat devices of " + accountId, ex);
        }
    }

    @Override
    public void save(HeartbeatToken token) {
        String sql = "insert into officium_heartbeat_token (id, account_id, token_hash, machine, created_at, last_used_at, "
                + "oauth_family_id) values (?, ?, ?, ?, ?, ?, ?)";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, token.id());
            statement.setObject(2, token.accountId());
            statement.setString(3, token.tokenHash());
            statement.setString(4, token.machine());
            statement.setTimestamp(5, Timestamp.from(token.createdAt()));
            statement.setTimestamp(6, token.lastUsedAt() == null ? null : Timestamp.from(token.lastUsedAt()));
            statement.setObject(7, token.signInFamily());
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save a heartbeat device of " + token.accountId(), ex);
        }
    }

    @Override
    public boolean delete(UUID accountId, UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_heartbeat_token where account_id = ? and id = ?")) {
            statement.setObject(1, accountId);
            statement.setObject(2, id);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to revoke a heartbeat device of " + accountId, ex);
        }
    }

    @Override
    public Optional<UUID> accountForTokenHash(String tokenHash, Instant usedAt, Instant staleBefore) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(RESOLVE)) {
            statement.setString(1, tokenHash);
            statement.setTimestamp(2, Timestamp.from(usedAt));
            statement.setTimestamp(3, Timestamp.from(staleBefore));
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(rs.getObject("account_id", UUID.class)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to resolve a heartbeat token", ex);
        }
    }
}
