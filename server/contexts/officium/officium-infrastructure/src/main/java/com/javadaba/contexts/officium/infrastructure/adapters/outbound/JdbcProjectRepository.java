package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.ports.ProjectRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JdbcProjectRepository implements ProjectRepository {

    private static final String SELECT = "select id, owner_account_id, folder_id, name, key_prefix, icon, icon_color, archived_at, "
            + "version, created_at, updated_at, form_languages, definition_of_done, protected from officium_project";

    private final DataSource dataSource;

    public JdbcProjectRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Project insert(Project project) {
        String sql = "insert into officium_project (id, owner_account_id, folder_id, name, key_prefix, "
                + "archived_at, version, created_at, updated_at, icon, icon_color, form_languages, definition_of_done) "
                + "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, project.id());
            statement.setObject(2, project.ownerAccountId());
            statement.setObject(3, project.folderId());
            statement.setString(4, project.name());
            statement.setString(5, project.keyPrefix());
            statement.setTimestamp(6, project.archivedAt() == null ? null : Timestamp.from(project.archivedAt()));
            statement.setInt(7, project.version());
            statement.setTimestamp(8, Timestamp.from(project.createdAt()));
            statement.setTimestamp(9, Timestamp.from(project.updatedAt()));
            statement.setString(10, project.icon());
            statement.setString(11, project.iconColor().wire());
            statement.setArray(12, connection.createArrayOf("text", project.formLanguages().toArray()));
            statement.setArray(13, connection.createArrayOf("text", project.definitionOfDone().toArray()));
            statement.executeUpdate();
            return project;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert project", ex);
        }
    }

    @Override
    public Optional<Project> findById(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(SELECT + " where id = ?")) {
            statement.setObject(1, id);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to find project " + id, ex);
        }
    }

    @Override
    public List<Project> listForAccount(UUID accountId, UUID folderId, boolean includeFolderFilter, Boolean archived) {
        StringBuilder sql = new StringBuilder(SELECT
                + " where (owner_account_id = ? or id in (select project_id from officium_project_member where account_id = ?)"
                + " or id in (select tp.project_id from officium_team_project tp join officium_team_member tm"
                + " on tm.team_id = tp.team_id where tm.account_id = ?))");
        List<Object> params = new ArrayList<>(List.of(accountId, accountId, accountId));
        if (includeFolderFilter) {
            sql.append(" and folder_id ").append(folderId == null ? "is null" : "= ?");
            if (folderId != null) {
                params.add(folderId);
            }
        }
        if (archived != null) {
            sql.append(archived ? " and archived_at is not null" : " and archived_at is null");
        }
        sql.append(" order by name");
        List<Project> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql.toString())) {
            for (int i = 0; i < params.size(); i++) {
                statement.setObject(i + 1, params.get(i));
            }
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list projects for " + accountId, ex);
        }
        return result;
    }

    @Override
    public List<Project> listOwnedBy(UUID ownerAccountId) {
        List<Project> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where owner_account_id = ? order by name")) {
            statement.setObject(1, ownerAccountId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the projects of " + ownerAccountId, ex);
        }
        return result;
    }

    @Override
    public boolean existsKeyPrefix(UUID ownerAccountId, String keyPrefix) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select 1 from officium_project where owner_account_id = ? and key_prefix = ? limit 1")) {
            statement.setObject(1, ownerAccountId);
            statement.setString(2, keyPrefix);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to check key prefix " + keyPrefix, ex);
        }
    }

    @Override
    public boolean updateIfVersion(Project updated, int expectedVersion) {
        // Never writes owner_account_id or protected: the database freezes both for a protected project (JAVA-1853).
        String sql = "update officium_project set folder_id = ?, name = ?, archived_at = ?, version = ?, "
                + "updated_at = ?, icon = ?, icon_color = ?, form_languages = ?, definition_of_done = ? "
                + "where id = ? and version = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, updated.folderId());
            statement.setString(2, updated.name());
            statement.setTimestamp(3, updated.archivedAt() == null ? null : Timestamp.from(updated.archivedAt()));
            statement.setInt(4, updated.version());
            statement.setTimestamp(5, Timestamp.from(updated.updatedAt()));
            statement.setString(6, updated.icon());
            statement.setString(7, updated.iconColor().wire());
            statement.setArray(8, connection.createArrayOf("text", updated.formLanguages().toArray()));
            statement.setArray(9, connection.createArrayOf("text", updated.definitionOfDone().toArray()));
            statement.setObject(10, updated.id());
            statement.setInt(11, expectedVersion);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to update project " + updated.id(), ex);
        }
    }

    @Override
    public int allocateCardNumber(UUID projectId) {
        String sql = "update officium_project set next_card_number = next_card_number + 1 where id = ? "
                + "returning next_card_number - 1";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    throw new IllegalStateException(
                            "Project " + projectId + " not found while allocating a card number");
                }
                return rs.getInt(1);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to allocate card number for " + projectId, ex);
        }
    }

    @Override
    public boolean delete(UUID projectId) {
        // One statement: the foreign keys' ON DELETE CASCADE removes everything the project owns in
        // the same transaction (the test in OfficiumProjectDeleteTest proves no table keeps a row).
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_project where id = ?")) {
            statement.setObject(1, projectId);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to delete project " + projectId, ex);
        }
    }

    private static Project map(ResultSet rs) throws SQLException {
        Timestamp archivedAt = rs.getTimestamp("archived_at");
        return new Project(rs.getObject("id", UUID.class), rs.getObject("owner_account_id", UUID.class),
                rs.getObject("folder_id", UUID.class), rs.getString("name"), rs.getString("key_prefix"),
                rs.getString("icon"), com.javadaba.contexts.officium.domain.ProjectColor.fromWire(
                        rs.getString("icon_color")),
                archivedAt == null ? null : archivedAt.toInstant(), rs.getInt("version"),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant(),
                List.of((String[]) rs.getArray("form_languages").getArray()),
                List.of((String[]) rs.getArray("definition_of_done").getArray()), rs.getBoolean("protected"));
    }
}
