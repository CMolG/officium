package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.contexts.officium.domain.WorkProfile;
import com.javadaba.contexts.officium.domain.WorkProfiles;
import com.javadaba.contexts.officium.domain.ports.WorkProfileRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Work profiles (card://JAVA-1524): {@code officium_work_profile} and {@code officium_project_work_profile}. */
@ApplicationScoped
public class JdbcWorkProfileRepository implements WorkProfileRepository {

    private static final String SELECT = "select profile_id, name, overrides, version, updated_at "
            + "from officium_work_profile ";

    private final DataSource dataSource;

    public JdbcWorkProfileRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<WorkProfile> listByAccount(UUID accountId) {
        return query(SELECT + "where account_id = ? order by name, profile_id", accountId, null);
    }

    @Override
    public Optional<WorkProfile> find(UUID accountId, String profileId) {
        return query(SELECT + "where account_id = ? and profile_id = ?", accountId, profileId).stream().findFirst();
    }

    @Override
    public boolean saveIfVersion(UUID accountId, String profileId, String name, RoleMatrix overrides,
            int expectedVersion, Instant at) {
        String sql = expectedVersion == 0
                ? "insert into officium_work_profile (name, overrides, version, updated_at, account_id, profile_id) "
                        + "values (?, cast(? as jsonb), 1, ?, ?, ?) on conflict (account_id, profile_id) do nothing"
                : "update officium_work_profile set name = ?, overrides = cast(? as jsonb), version = version + 1, "
                        + "updated_at = ? where account_id = ? and profile_id = ? and version = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, name);
            statement.setString(2, JdbcRoleMatrixRepository.write(overrides));
            statement.setTimestamp(3, Timestamp.from(at));
            statement.setObject(4, accountId);
            statement.setString(5, profileId);
            if (expectedVersion != 0) {
                statement.setInt(6, expectedVersion);
            }
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the work profile " + profileId, ex);
        }
    }

    @Override
    public void delete(UUID accountId, String profileId) {
        update("delete from officium_work_profile where account_id = ? and profile_id = ?", accountId, profileId);
    }

    @Override
    public Optional<Active> active(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement("select account_id, profile_id, "
                        + "activated_at, shuffle from officium_project_work_profile where project_id = ?")) {
            statement.setObject(1, projectId);
            try (ResultSet rows = statement.executeQuery()) {
                return rows.next()
                        ? Optional.of(new Active(rows.getObject(1, UUID.class), rows.getString(2),
                                rows.getTimestamp(3).toInstant(), rows.getBoolean(4)))
                        : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the active profile of " + projectId, ex);
        }
    }

    @Override
    public void activate(UUID projectId, UUID accountId, String profileId, Instant at, Boolean shuffle) {
        if (profileId == null) {
            update("delete from officium_project_work_profile where project_id = ?", projectId, null);
            return;
        }
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement("insert into officium_project_work_profile "
                        + "(project_id, account_id, profile_id, activated_at, shuffle) values (?, ?, ?, ?, "
                        + "coalesce(?, false)) on conflict (project_id) do update set account_id = "
                        + "excluded.account_id, profile_id = excluded.profile_id, activated_at = "
                        + "excluded.activated_at, shuffle = coalesce(?, officium_project_work_profile.shuffle)")) {
            statement.setObject(1, projectId);
            statement.setObject(2, accountId);
            statement.setString(3, profileId);
            statement.setTimestamp(4, Timestamp.from(at));
            statement.setObject(5, shuffle, Types.BOOLEAN);
            statement.setObject(6, shuffle, Types.BOOLEAN);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to activate a work profile on " + projectId, ex);
        }
    }

    private void update(String sql, UUID id, String profileId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, id);
            if (profileId != null) {
                statement.setString(2, profileId);
            }
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to write work profiles", ex);
        }
    }

    private List<WorkProfile> query(String sql, UUID accountId, String profileId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, accountId);
            if (profileId != null) {
                statement.setString(2, profileId);
            }
            try (ResultSet rows = statement.executeQuery()) {
                List<WorkProfile> result = new ArrayList<>();
                while (rows.next()) {
                    String id = rows.getString("profile_id");
                    result.add(new WorkProfile(id, rows.getString("name"), WorkProfiles.isBuiltin(id),
                            JdbcRoleMatrixRepository.read(rows.getString("overrides")), rows.getInt("version"),
                            rows.getTimestamp("updated_at").toInstant()));
                }
                return result;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read work profiles", ex);
        }
    }
}
