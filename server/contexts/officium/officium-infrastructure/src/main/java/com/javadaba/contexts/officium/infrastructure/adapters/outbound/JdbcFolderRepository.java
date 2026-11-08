package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Folder;
import com.javadaba.contexts.officium.domain.ports.FolderRepository;
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
public class JdbcFolderRepository implements FolderRepository {

    private static final String SELECT = "select id, owner_account_id, parent_id, name, created_at, updated_at "
            + "from officium_folder";

    private final DataSource dataSource;

    public JdbcFolderRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Folder insert(Folder folder) {
        String sql = "insert into officium_folder (id, owner_account_id, parent_id, name, created_at, updated_at) "
                + "values (?, ?, ?, ?, ?, ?)";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, folder.id());
            statement.setObject(2, folder.ownerAccountId());
            statement.setObject(3, folder.parentId());
            statement.setString(4, folder.name());
            statement.setTimestamp(5, Timestamp.from(folder.createdAt()));
            statement.setTimestamp(6, Timestamp.from(folder.updatedAt()));
            statement.executeUpdate();
            return folder;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert folder", ex);
        }
    }

    @Override
    public Optional<Folder> findById(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(SELECT + " where id = ?")) {
            statement.setObject(1, id);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to find folder " + id, ex);
        }
    }

    @Override
    public List<Folder> listByOwner(UUID ownerAccountId) {
        List<Folder> result = new ArrayList<>();
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
            throw new IllegalStateException("Unable to list folders for " + ownerAccountId, ex);
        }
        return result;
    }

    @Override
    public Folder update(Folder folder) {
        String sql = "update officium_folder set parent_id = ?, name = ?, updated_at = ? where id = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, folder.parentId());
            statement.setString(2, folder.name());
            statement.setTimestamp(3, Timestamp.from(folder.updatedAt()));
            statement.setObject(4, folder.id());
            statement.executeUpdate();
            return folder;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to update folder " + folder.id(), ex);
        }
    }

    @Override
    public void delete(UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement("delete from officium_folder where id = ?")) {
            statement.setObject(1, id);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to delete folder " + id, ex);
        }
    }

    @Override
    public boolean hasProjects(UUID id) {
        return exists("select 1 from officium_project where folder_id = ? limit 1", id);
    }

    @Override
    public boolean hasChildFolders(UUID id) {
        return exists("select 1 from officium_folder where parent_id = ? limit 1", id);
    }

    private boolean exists(String sql, UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, id);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to check folder " + id, ex);
        }
    }

    private static Folder map(ResultSet rs) throws SQLException {
        return new Folder(rs.getObject("id", UUID.class), rs.getObject("owner_account_id", UUID.class),
                rs.getObject("parent_id", UUID.class), rs.getString("name"),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    }
}
