package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocNode;
import com.javadaba.contexts.officium.domain.DocSortMode;
import com.javadaba.contexts.officium.domain.ports.DocNodeRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** JAVA-791: the documentation tree's sparse layout rows, in {@code officium_doc_node}. */
@ApplicationScoped
public class JdbcDocNodeRepository implements DocNodeRepository {

    private static final String SELECT = "select project_id, path, icon, icon_color, sort_mode, position, version, "
            + "updated_at, full_width, id from officium_doc_node where project_id = ?";

    // The id is bound on a first write only and is never part of the update: a star points at it (JAVA-799).
    private static final String UPSERT = "insert into officium_doc_node (project_id, path, icon, icon_color, "
            + "sort_mode, position, version, updated_at, full_width, id) values (?, ?, ?, ?, ?, ?, ?, ?, ?, "
            + "coalesce(?, gen_random_uuid())) "
            + "on conflict (project_id, path) do update set icon = excluded.icon, icon_color = excluded.icon_color, "
            + "sort_mode = excluded.sort_mode, position = excluded.position, version = excluded.version, "
            + "updated_at = excluded.updated_at, full_width = excluded.full_width";

    private final DataSource dataSource;

    public JdbcDocNodeRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<DocNode> list(UUID projectId) {
        List<DocNode> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(SELECT + " order by path")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the doc nodes of " + projectId, ex);
        }
        return result;
    }

    @Override
    public Optional<DocNode> find(UUID projectId, String path) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(SELECT + " and path = ?")) {
            statement.setObject(1, projectId);
            statement.setString(2, path);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read doc node " + path, ex);
        }
    }

    @Override
    public boolean insert(DocNode node) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        UPSERT.substring(0, UPSERT.indexOf(" on conflict")))) {
            bind(statement, node);
            statement.executeUpdate();
            return true;
        } catch (SQLException ex) {
            if ("23505".equals(ex.getSQLState())) {
                return false;
            }
            throw new IllegalStateException("Unable to insert doc node " + node.path(), ex);
        }
    }

    @Override
    public boolean updateIfVersion(DocNode node, int expectedVersion) {
        String sql = "update officium_doc_node set icon = ?, icon_color = ?, sort_mode = ?, position = ?, "
                + "version = ?, updated_at = ?, full_width = ? where project_id = ? and path = ? and version = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, node.icon());
            statement.setString(2, node.iconColor());
            statement.setString(3, node.sortMode().wire());
            if (node.position() == null) {
                statement.setNull(4, Types.INTEGER);
            } else {
                statement.setInt(4, node.position());
            }
            statement.setInt(5, node.version());
            statement.setTimestamp(6, Timestamp.from(node.updatedAt()));
            statement.setBoolean(7, node.fullWidth());
            statement.setObject(8, node.projectId());
            statement.setString(9, node.path());
            statement.setInt(10, expectedVersion);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to update doc node " + node.path(), ex);
        }
    }

    @Override
    public void upsertAll(List<DocNode> nodes) {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (PreparedStatement statement = connection.prepareStatement(UPSERT)) {
                for (DocNode node : nodes) {
                    bind(statement, node);
                    statement.executeUpdate();
                }
                connection.commit();
            } catch (SQLException ex) {
                connection.rollback();
                throw ex;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to write doc nodes", ex);
        }
    }

    @Override
    public boolean deleteIfVersion(UUID projectId, String path, int expectedVersion) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_doc_node where project_id = ? and path = ? and version = ?")) {
            statement.setObject(1, projectId);
            statement.setString(2, path);
            statement.setInt(3, expectedVersion);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to delete doc node " + path, ex);
        }
    }

    private static void bind(PreparedStatement statement, DocNode node) throws SQLException {
        statement.setObject(1, node.projectId());
        statement.setString(2, node.path());
        statement.setString(3, node.icon());
        statement.setString(4, node.iconColor());
        statement.setString(5, node.sortMode().wire());
        if (node.position() == null) {
            statement.setNull(6, Types.INTEGER);
        } else {
            statement.setInt(6, node.position());
        }
        statement.setInt(7, node.version());
        statement.setTimestamp(8, Timestamp.from(node.updatedAt()));
        statement.setBoolean(9, node.fullWidth());
        statement.setObject(10, node.id());
    }

    private static DocNode map(ResultSet rs) throws SQLException {
        return new DocNode(rs.getObject("project_id", UUID.class), rs.getString("path"), rs.getString("icon"),
                rs.getString("icon_color"), DocSortMode.fromWire(rs.getString("sort_mode")),
                rs.getObject("position", Integer.class), rs.getInt("version"),
                rs.getTimestamp("updated_at").toInstant(), rs.getBoolean("full_width"), rs.getObject("id", UUID.class));
    }
}
