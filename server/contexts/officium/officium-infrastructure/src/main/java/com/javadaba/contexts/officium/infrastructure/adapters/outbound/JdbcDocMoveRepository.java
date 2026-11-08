package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocLinks;
import com.javadaba.contexts.officium.domain.DocMove;
import com.javadaba.contexts.officium.domain.DocNode;
import com.javadaba.contexts.officium.domain.ports.DocMoveRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.util.List;
import java.util.UUID;

/** JAVA-792: moves a documentation subtree in one transaction (contract §8.20). */
@ApplicationScoped
public class JdbcDocMoveRepository implements DocMoveRepository {

    private final DataSource dataSource;

    public JdbcDocMoveRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public boolean move(UUID projectId, UUID accountId, String to, List<DocMove.Moved> pages,
            List<DocMove.Moved> nodeRenames, List<DocNode> nodesAfter) {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                deleteNodes(connection, projectId, to);
                for (DocMove.Moved rename : nodeRenames) {
                    renameNode(connection, projectId, rename);
                }
                for (DocMove.Moved moved : pages) {
                    movePage(connection, projectId, accountId, moved);
                }
                for (DocNode node : nodesAfter) {
                    insertNode(connection, node);
                }
                connection.commit();
                return true;
            } catch (SQLException ex) {
                connection.rollback();
                throw ex;
            }
        } catch (SQLException ex) {
            if ("23505".equals(ex.getSQLState())) {
                return false;
            }
            throw new IllegalStateException("Unable to move to " + to, ex);
        }
    }

    private static void movePage(Connection connection, UUID projectId, UUID accountId, DocMove.Moved moved)
            throws SQLException {
        UUID pageId;
        String body;
        int version;
        try (PreparedStatement statement = connection.prepareStatement("update officium_doc_page set path = ? "
                + "where project_id = ? and path = ? and deleted_at is null "
                + "and (published_at is not null or created_by->>'accountId' = ?) returning id, body, version")) {
            statement.setString(1, moved.to());
            statement.setObject(2, projectId);
            statement.setString(3, moved.from());
            statement.setString(4, accountId.toString());
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return;
                }
                pageId = rs.getObject("id", UUID.class);
                body = rs.getString("body");
                version = rs.getInt("version");
            }
        }
        try (PreparedStatement statement = connection.prepareStatement("insert into officium_doc_redirect "
                + "(project_id, from_path, page_id) values (?, ?, ?) on conflict (project_id, from_path) "
                + "do update set page_id = excluded.page_id")) {
            statement.setObject(1, projectId);
            statement.setString(2, moved.from());
            statement.setObject(3, pageId);
            statement.executeUpdate();
        }
        try (PreparedStatement statement = connection.prepareStatement(
                "delete from officium_doc_redirect where project_id = ? and from_path = ?")) {
            statement.setObject(1, projectId);
            statement.setString(2, moved.to());
            statement.executeUpdate();
        }
        DocLinkWrites.replace(connection, projectId, pageId, version, DocLinks.extract(moved.to(), body));
    }

    /** Rewrites the path of a layout row in place: its identity (and what refers to it) stays. */
    private static void renameNode(Connection connection, UUID projectId, DocMove.Moved rename) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "update officium_doc_node set path = ? where project_id = ? and path = ?")) {
            statement.setString(1, rename.to());
            statement.setObject(2, projectId);
            statement.setString(3, rename.from());
            statement.executeUpdate();
        }
    }

    private static void deleteNodes(Connection connection, UUID projectId, String root) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "delete from officium_doc_node where project_id = ? and (path = ? or path like ?)")) {
            statement.setObject(1, projectId);
            statement.setString(2, root);
            statement.setString(3, root.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "/%");
            statement.executeUpdate();
        }
    }

    private static void insertNode(Connection connection, DocNode node) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("insert into officium_doc_node "
                + "(project_id, path, icon, icon_color, sort_mode, position, version, updated_at, full_width) "
                + "values (?, ?, ?, ?, ?, ?, ?, ?, ?) on conflict (project_id, path) do update set "
                + "icon = excluded.icon, icon_color = excluded.icon_color, sort_mode = excluded.sort_mode, "
                + "position = excluded.position, version = excluded.version, updated_at = excluded.updated_at, "
                + "full_width = excluded.full_width")) {
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
            statement.executeUpdate();
        }
    }
}
