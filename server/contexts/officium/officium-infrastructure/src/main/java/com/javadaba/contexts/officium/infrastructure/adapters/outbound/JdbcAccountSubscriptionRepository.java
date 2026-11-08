package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.ports.AccountSubscriptionRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** card://JAVA-1047: the account's subscription price, the one row per account the value report reads. */
@ApplicationScoped
public class JdbcAccountSubscriptionRepository implements AccountSubscriptionRepository {

    private final DataSource dataSource;

    public JdbcAccountSubscriptionRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Optional<Double> monthlyUsdOf(UUID accountId) {
        Map<UUID, Double> found = monthlyUsdOf(List.of(accountId));
        return Optional.ofNullable(found.get(accountId));
    }

    @Override
    public Map<UUID, Double> monthlyUsdOf(Collection<UUID> accountIds) {
        Map<UUID, Double> result = new HashMap<>();
        if (accountIds.isEmpty()) {
            return result;
        }
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select account_id, monthly_usd from officium_account_subscription where account_id = any(?)")) {
            statement.setArray(1, connection.createArrayOf("uuid", accountIds.toArray()));
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.put(rs.getObject("account_id", UUID.class), rs.getDouble("monthly_usd"));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the subscription prices of " + accountIds.size()
                    + " accounts", ex);
        }
        return result;
    }

    @Override
    public void save(UUID accountId, double monthlyUsd, Instant updatedAt) {
        String sql = "insert into officium_account_subscription (account_id, monthly_usd, updated_at) values (?, ?, ?) "
                + "on conflict (account_id) do update set monthly_usd = excluded.monthly_usd, "
                + "updated_at = excluded.updated_at";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, accountId);
            statement.setBigDecimal(2, BigDecimal.valueOf(monthlyUsd));
            statement.setTimestamp(3, Timestamp.from(updatedAt));
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the subscription price of " + accountId, ex);
        }
    }
}
