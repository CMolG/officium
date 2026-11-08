package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocAttachment;
import com.javadaba.contexts.officium.domain.ports.DocAttachmentRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** The files of documentation pages (JAVA-798). No list reads {@code data}. */
@ApplicationScoped
public class JdbcDocAttachmentRepository implements DocAttachmentRepository {

    private static final String COLUMNS = "id, project_id, page_id, name, kind, content_type, original_bytes, "
            + "stored_bytes, width, height, sha256, created_by, created_at";

    private final DataSource dataSource;

    public JdbcDocAttachmentRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<DocAttachment> listByPage(UUID pageId) {
        return query("select " + COLUMNS + " from officium_doc_attachment where page_id = ? order by name", pageId);
    }

    @Override
    public List<DocAttachment> listCreatedBefore(Instant cutoff) {
        return query("select " + COLUMNS + " from officium_doc_attachment where created_at < ?",
                Timestamp.from(cutoff));
    }

    @Override
    public Optional<DocAttachment> find(UUID pageId, String name) {
        return query("select " + COLUMNS + " from officium_doc_attachment where page_id = ? and name = ?", pageId, name)
                .stream().findFirst();
    }

    @Override
    public Optional<byte[]> readData(UUID attachmentId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select data from officium_doc_attachment where id = ?")) {
            statement.setObject(1, attachmentId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(rs.getBytes(1)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the file " + attachmentId, ex);
        }
    }

    @Override
    public boolean insert(DocAttachment a, byte[] data) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "insert into officium_doc_attachment (" + COLUMNS
                                + ", data) values (?, ?, ?, ?, ?, ?, ?, ?, ?, "
                                + "?, ?, cast(? as jsonb), ?, ?) on conflict (page_id, name) do nothing")) {
            statement.setObject(1, a.id());
            statement.setObject(2, a.projectId());
            statement.setObject(3, a.pageId());
            statement.setString(4, a.name());
            statement.setString(5, a.kind().name().toLowerCase(java.util.Locale.ROOT));
            statement.setString(6, a.contentType());
            statement.setLong(7, a.originalBytes());
            statement.setLong(8, a.storedBytes());
            statement.setInt(9, a.width());
            statement.setInt(10, a.height());
            statement.setString(11, a.sha256());
            statement.setString(12, OfficiumJson.writeActor(a.createdBy()));
            statement.setTimestamp(13, Timestamp.from(a.createdAt()));
            statement.setBytes(14, data);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to store the file " + a.name(), ex);
        }
    }

    @Override
    public boolean delete(UUID pageId, String name) {
        return update("delete from officium_doc_attachment where page_id = ? and name = ?", pageId, name);
    }

    @Override
    public boolean deleteById(UUID id) {
        return update("delete from officium_doc_attachment where id = ?", id);
    }

    @Override
    public Map<String, List<UUID>> pageIdsByPath(UUID projectId) {
        Map<String, List<UUID>> pages = new HashMap<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select path, id from officium_doc_page where project_id = ?")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    pages.computeIfAbsent(rs.getString(1), path -> new ArrayList<>()).add(rs.getObject(2, UUID.class));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the pages of " + projectId, ex);
        }
        return pages;
    }

    @Override
    public List<String> bodiesReferencingFiles(UUID projectId) {
        List<String> bodies = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select body from officium_doc_page where project_id = ? and body like '%/\\_files/%' "
                                + "union all select body from officium_doc_revision where project_id = ? "
                                + "and body like '%/\\_files/%'")) {
            statement.setObject(1, projectId);
            statement.setObject(2, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    bodies.add(rs.getString(1));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the bodies of " + projectId, ex);
        }
        return bodies;
    }

    private boolean update(String sql, Object... params) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                statement.setObject(i + 1, params[i]);
            }
            return statement.executeUpdate() > 0;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to change the files of a page", ex);
        }
    }

    private List<DocAttachment> query(String sql, Object... params) {
        List<DocAttachment> found = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                statement.setObject(i + 1, params[i]);
            }
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    found.add(new DocAttachment(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                            rs.getObject("page_id", UUID.class), rs.getString("name"),
                            DocAttachment.Kind.valueOf(rs.getString("kind").toUpperCase(java.util.Locale.ROOT)),
                            rs.getString("content_type"), rs.getLong("original_bytes"), rs.getLong("stored_bytes"),
                            rs.getInt("width"), rs.getInt("height"), rs.getString("sha256"),
                            OfficiumJson.readActor(rs.getString("created_by")),
                            rs.getTimestamp("created_at").toInstant()));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the files of a page", ex);
        }
        return found;
    }
}
