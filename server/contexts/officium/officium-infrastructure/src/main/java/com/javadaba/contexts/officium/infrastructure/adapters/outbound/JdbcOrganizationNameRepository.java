package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.OrganizationName;
import com.javadaba.contexts.officium.domain.ports.OrganizationNameRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JdbcOrganizationNameRepository implements OrganizationNameRepository {

    private final DataSource dataSource;

    public JdbcOrganizationNameRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Optional<OrganizationName> find(UUID ownerAccountId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select name from officium_organization where owner_account_id = ?")) {
            statement.setObject(1, ownerAccountId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(new OrganizationName(rs.getString(1))) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the organization name of " + ownerAccountId, ex);
        }
    }

    @Override
    public void put(UUID ownerAccountId, OrganizationName name) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "insert into officium_organization (owner_account_id, name, updated_at) values (?, ?, now()) "
                                + "on conflict (owner_account_id) do update set name = excluded.name, updated_at = now()")) {
            statement.setObject(1, ownerAccountId);
            statement.setString(2, name.value());
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the organization name of " + ownerAccountId, ex);
        }
    }
}
