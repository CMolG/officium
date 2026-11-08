package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocLinks;
import com.javadaba.contexts.officium.domain.DocPageSummary;
import com.javadaba.contexts.officium.domain.ports.DocLinkRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** JAVA-792: which pages point at which paths, in {@code officium_doc_link}. */
@ApplicationScoped
public class JdbcDocLinkRepository implements DocLinkRepository {

    private final DataSource dataSource;

    public JdbcDocLinkRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<DocPageSummary> backlinks(UUID projectId, UUID accountId, UUID pageId, String path) {
        String sql = "select distinct p.id, p.path, p.title, p.version, p.updated_by, p.updated_at, p.published_at, "
                + "p.archived_at, p.archived_by, p.deleted_at, p.deleted_by "
                + "from officium_doc_page p join officium_doc_link l on l.from_page_id = p.id "
                + "where p.project_id = ? and p.id <> ? and p.deleted_at is null "
                + "and (p.published_at is not null or p.created_by->>'accountId' = ?) "
                + "and (l.to_path = ? or l.to_path in ("
                + "select r.from_path from officium_doc_redirect r where r.page_id = ?)) order by p.path";
        List<DocPageSummary> pages = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            statement.setObject(2, pageId);
            statement.setString(3, accountId.toString());
            statement.setString(4, path);
            statement.setObject(5, pageId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    pages.add(new DocPageSummary(rs.getObject("id", UUID.class), rs.getString("path"),
                            rs.getString("title"), rs.getInt("version"),
                            OfficiumJson.readActor(rs.getString("updated_by")),
                            rs.getTimestamp("updated_at").toInstant(), JdbcDocPageRepository.lifecycle(rs)));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the backlinks of " + path, ex);
        }
        return pages;
    }

    @Override
    public List<Unindexed> unindexed(int limit) {
        String sql = "select id, project_id, path, body, version from officium_doc_page "
                + "where links_version is distinct from version order by updated_at limit ?";
        List<Unindexed> pages = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, limit);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    pages.add(new Unindexed(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                            rs.getString("path"), rs.getString("body"), rs.getInt("version")));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the pages without an index", ex);
        }
        return pages;
    }

    @Override
    public boolean index(UUID pageId, int version, UUID projectId, List<DocLinks.Ref> refs) {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (PreparedStatement lock = connection.prepareStatement(
                    "select 1 from officium_doc_page where id = ? and version = ? for update")) {
                lock.setObject(1, pageId);
                lock.setInt(2, version);
                try (ResultSet rs = lock.executeQuery()) {
                    if (!rs.next()) {
                        connection.rollback();
                        return false;
                    }
                }
                DocLinkWrites.replace(connection, projectId, pageId, version, refs);
                connection.commit();
                return true;
            } catch (SQLException ex) {
                connection.rollback();
                throw ex;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to index the links of " + pageId, ex);
        }
    }
}
