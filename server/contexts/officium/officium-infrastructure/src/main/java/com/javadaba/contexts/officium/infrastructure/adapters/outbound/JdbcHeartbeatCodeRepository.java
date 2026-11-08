package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.HeartbeatCode;
import com.javadaba.contexts.officium.domain.ports.HeartbeatCodeRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JdbcHeartbeatCodeRepository implements HeartbeatCodeRepository {

    private final DataSource dataSource;

    public JdbcHeartbeatCodeRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void save(HeartbeatCode code) {
        String sql = "insert into officium_heartbeat_code (id, account_id, code_hash, expires_at, consumed_at, created_at, "
                + "oauth_family_id) values (?, ?, ?, ?, ?, ?, ?)";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, code.id());
            statement.setObject(2, code.accountId());
            statement.setString(3, code.codeHash());
            statement.setTimestamp(4, Timestamp.from(code.expiresAt()));
            statement.setTimestamp(5, code.consumedAt() == null ? null : Timestamp.from(code.consumedAt()));
            statement.setTimestamp(6, Timestamp.from(code.createdAt()));
            statement.setObject(7, code.signInFamily());
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save a heartbeat setup code", ex);
        }
    }

    @Override
    public Optional<HeartbeatCode> findByCodeHash(String codeHash) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select id, account_id, expires_at, consumed_at, created_at, oauth_family_id "
                                + "from officium_heartbeat_code where code_hash = ?")) {
            statement.setString(1, codeHash);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return Optional.empty();
                }
                Timestamp consumed = rs.getTimestamp("consumed_at");
                return Optional.of(new HeartbeatCode(rs.getObject("id", UUID.class),
                        rs.getObject("account_id", UUID.class), codeHash, rs.getTimestamp("expires_at").toInstant(),
                        consumed == null ? null : consumed.toInstant(), rs.getTimestamp("created_at").toInstant(),
                        rs.getObject("oauth_family_id", UUID.class)));
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read a heartbeat setup code", ex);
        }
    }

    @Override
    public boolean consume(UUID id, Instant now) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "update officium_heartbeat_code set consumed_at = ? where id = ? and consumed_at is null "
                                + "and expires_at > ?")) {
            statement.setTimestamp(1, Timestamp.from(now));
            statement.setObject(2, id);
            statement.setTimestamp(3, Timestamp.from(now));
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to spend a heartbeat setup code", ex);
        }
    }

    @Override
    public int countLive(UUID accountId, Instant now) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select count(*) from officium_heartbeat_code where account_id = ? and consumed_at is null "
                                + "and expires_at > ?")) {
            statement.setObject(1, accountId);
            statement.setTimestamp(2, Timestamp.from(now));
            try (ResultSet rs = statement.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to count the heartbeat setup codes of " + accountId, ex);
        }
    }

    @Override
    public void deleteExpired(Instant now) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_heartbeat_code where expires_at <= ?")) {
            statement.setTimestamp(1, Timestamp.from(now));
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to sweep lapsed heartbeat setup codes", ex);
        }
    }
}
