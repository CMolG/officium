package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Nickname;
import com.javadaba.contexts.officium.domain.ports.NicknameRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JdbcNicknameRepository implements NicknameRepository {

    private final DataSource dataSource;

    public JdbcNicknameRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Optional<Nickname> find(UUID organizationId, UUID accountId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select nickname from officium_nickname where organization_id = ? and account_id = ?")) {
            statement.setObject(1, organizationId);
            statement.setObject(2, accountId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(new Nickname(rs.getString(1))) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the nickname of " + accountId, ex);
        }
    }

    @Override
    public Map<UUID, Nickname> listByOrganization(UUID organizationId) {
        Map<UUID, Nickname> result = new LinkedHashMap<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select account_id, nickname from officium_nickname where organization_id = ?")) {
            statement.setObject(1, organizationId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.put(rs.getObject(1, UUID.class), new Nickname(rs.getString(2)));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the nicknames of " + organizationId, ex);
        }
        return result;
    }

    @Override
    public boolean put(UUID organizationId, UUID accountId, Nickname nickname) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "insert into officium_nickname (organization_id, account_id, nickname, updated_at) "
                                + "values (?, ?, ?, now()) on conflict (organization_id, account_id) "
                                + "do update set nickname = excluded.nickname, updated_at = now()")) {
            statement.setObject(1, organizationId);
            statement.setObject(2, accountId);
            statement.setString(3, nickname.value());
            statement.executeUpdate();
            return true;
        } catch (SQLException ex) {
            // uq_officium_nickname_org_name: someone else in the organization has it, in any case.
            if ("23505".equals(ex.getSQLState())) {
                return false;
            }
            throw new IllegalStateException("Unable to save the nickname of " + accountId, ex);
        }
    }

    @Override
    public void delete(UUID organizationId, UUID accountId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_nickname where organization_id = ? and account_id = ?")) {
            statement.setObject(1, organizationId);
            statement.setObject(2, accountId);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to clear the nickname of " + accountId, ex);
        }
    }
}
