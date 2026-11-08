package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocLifecycle;
import com.javadaba.contexts.officium.domain.DocLinks;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.DocPageSummary;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class JdbcDocPageRepository implements DocPageRepository {

    private static final String SUMMARY = "select id, path, title, version, updated_by, updated_at, published_at, "
            + "archived_at, archived_by, deleted_at, deleted_by, template from officium_doc_page where project_id = ? ";

    /** Not in the trash, not a template, and published or the caller's own: the next parameter is their account. */
    private static final String IN_TREE = "and deleted_at is null and archived_at is null and not template "
            + "and (published_at is not null or created_by->>'accountId' = ?) ";

    private static final String SELECT = "select id, project_id, path, title, body, version, created_by, "
            + "updated_by, created_at, updated_at, published_at, archived_at, archived_by, deleted_at, deleted_by, "
            + "template, co_authors from officium_doc_page";

    private final DataSource dataSource;

    public JdbcDocPageRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<DocPageSummary> list(UUID projectId, UUID accountId) {
        return summaries(SUMMARY + IN_TREE + "order by path", projectId, accountId.toString());
    }

    @Override
    public List<DocPageSummary> listTemplates(UUID projectId) {
        return summaries(SUMMARY + "and deleted_at is null and template order by path", projectId);
    }

    @Override
    public List<DocPageSummary> listUnpublished(UUID projectId, UUID accountId) {
        return summaries(SUMMARY + "and deleted_at is null and published_at is null "
                + "and created_by->>'accountId' = ? order by path", projectId, accountId.toString());
    }

    @Override
    public List<DocPageSummary> listArchived(UUID projectId) {
        return summaries(SUMMARY + "and deleted_at is null and archived_at is not null order by archived_at desc",
                projectId);
    }

    @Override
    public List<DocPageSummary> listTrash(UUID projectId, UUID accountId) {
        return summaries(SUMMARY + "and deleted_at is not null and (published_at is not null "
                + "or created_by->>'accountId' = ?) order by deleted_at desc", projectId, accountId.toString());
    }

    @Override
    public Optional<DocPage> find(UUID projectId, String path) {
        return one(" where project_id = ? and path = ? and deleted_at is null", projectId, path);
    }

    @Override
    public Optional<DocPage> findById(UUID projectId, UUID id) {
        return one(" where project_id = ? and id = ? and deleted_at is null", projectId, id);
    }

    @Override
    public Optional<DocPage> findTrashed(UUID projectId, UUID id) {
        return one(" where project_id = ? and id = ? and deleted_at is not null", projectId, id);
    }

    @Override
    public boolean insert(DocPage page) {
        String sql = "insert into officium_doc_page (id, project_id, path, title, body, version, created_by, "
                + "updated_by, created_at, updated_at, published_at, template) values (?, ?, ?, ?, ?, ?, "
                + "cast(? as jsonb), cast(? as jsonb), ?, ?, ?, ?)";
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setObject(1, page.id());
                statement.setObject(2, page.projectId());
                statement.setString(3, page.path());
                statement.setString(4, page.title());
                statement.setString(5, page.body());
                statement.setInt(6, page.version());
                statement.setString(7, OfficiumJson.writeActor(page.createdBy()));
                statement.setString(8, OfficiumJson.writeActor(page.updatedBy()));
                statement.setTimestamp(9, Timestamp.from(page.createdAt()));
                statement.setTimestamp(10, Timestamp.from(page.updatedAt()));
                statement.setTimestamp(11, timestamp(page.lifecycle().publishedAt()));
                statement.setBoolean(12, page.template());
                statement.executeUpdate();
                DocRedirectWrites.drop(connection, page);
                DocLinkWrites.replace(connection, page.projectId(), page.id(), page.version(),
                        DocLinks.extract(page.path(), page.body()));
                connection.commit();
                return true;
            } catch (SQLException ex) {
                connection.rollback();
                throw ex;
            }
        } catch (SQLException ex) {
            // uq_officium_doc_page_live_path: another create took the path in between.
            if ("23505".equals(ex.getSQLState())) {
                return false;
            }
            throw new IllegalStateException("Unable to insert page " + page.path(), ex);
        }
    }

    @Override
    public boolean updateIfVersion(DocPage page, int expectedVersion) {
        String sql = "update officium_doc_page set title = ?, body = ?, version = ?, updated_by = cast(? as jsonb), "
                + "updated_at = ?, co_authors = cast(? as jsonb) where id = ? and version = ? "
                + "and deleted_at is null";
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setString(1, page.title());
                statement.setString(2, page.body());
                statement.setInt(3, page.version());
                statement.setString(4, OfficiumJson.writeActor(page.updatedBy()));
                statement.setTimestamp(5, Timestamp.from(page.updatedAt()));
                statement.setString(6, OfficiumJson.writeActors(page.coAuthors()));
                statement.setObject(7, page.id());
                statement.setInt(8, expectedVersion);
                if (statement.executeUpdate() != 1) {
                    connection.rollback();
                    return false;
                }
                DocLinkWrites.replace(connection, page.projectId(), page.id(), page.version(),
                        DocLinks.extract(page.path(), page.body()));
                connection.commit();
                return true;
            } catch (SQLException ex) {
                connection.rollback();
                throw ex;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to update page " + page.path(), ex);
        }
    }

    @Override
    public boolean updateLifecycle(DocPage page, DocLifecycle expected) {
        DocLifecycle life = page.lifecycle();
        String sql = "update officium_doc_page set published_at = ?, archived_at = ?, archived_by = cast(? as jsonb), "
                + "deleted_at = ?, deleted_by = cast(? as jsonb) where id = ? and version = ? "
                + "and published_at is not distinct from cast(? as timestamptz) "
                + "and archived_at is not distinct from cast(? as timestamptz) "
                + "and deleted_at is not distinct from cast(? as timestamptz)";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setTimestamp(1, timestamp(life.publishedAt()));
            statement.setTimestamp(2, timestamp(life.archivedAt()));
            statement.setString(3, actorJson(life.archivedBy()));
            statement.setTimestamp(4, timestamp(life.deletedAt()));
            statement.setString(5, actorJson(life.deletedBy()));
            statement.setObject(6, page.id());
            statement.setInt(7, page.version());
            statement.setTimestamp(8, timestamp(expected.publishedAt()));
            statement.setTimestamp(9, timestamp(expected.archivedAt()));
            statement.setTimestamp(10, timestamp(expected.deletedAt()));
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            // A restore whose path a live page took meanwhile (uq_officium_doc_page_live_path).
            if ("23505".equals(ex.getSQLState())) {
                return false;
            }
            throw new IllegalStateException("Unable to change the lifecycle of page " + page.path(), ex);
        }
    }

    @Override
    public boolean purgeTrashed(UUID projectId, UUID id) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_doc_page where project_id = ? and id = ? and deleted_at is not null")) {
            statement.setObject(1, projectId);
            statement.setObject(2, id);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to purge page " + id, ex);
        }
    }

    @Override
    public int purgeTrashedBefore(Instant cutoff) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_doc_page where deleted_at is not null and deleted_at < ?")) {
            statement.setTimestamp(1, Timestamp.from(cutoff));
            return statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to sweep the trashed pages", ex);
        }
    }

    @Override
    public Set<String> pathsAmong(UUID projectId, Collection<String> paths) {
        Set<String> found = new HashSet<>();
        if (paths.isEmpty()) {
            return found;
        }
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select path from officium_doc_page where project_id = ? and path = any(?) "
                                + "and deleted_at is null")) {
            statement.setObject(1, projectId);
            statement.setArray(2, connection.createArrayOf("text", paths.toArray()));
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    found.add(rs.getString(1));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to look up pages of " + projectId, ex);
        }
        return found;
    }

    @Override
    public Set<String> parentsAmong(UUID projectId, Collection<String> paths) {
        Set<String> parents = new HashSet<>();
        if (paths.isEmpty()) {
            return parents;
        }
        String sql = "select distinct p.path from unnest(?) as p(path) where exists (select 1 from "
                + "officium_doc_page d where d.project_id = ? and d.deleted_at is null and d.path like p.path || '/%')";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setArray(1, connection.createArrayOf("text", paths.toArray()));
            statement.setObject(2, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    parents.add(rs.getString(1));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to look up folders of " + projectId, ex);
        }
        return parents;
    }

    private Optional<DocPage> one(String where, UUID projectId, Object key) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(SELECT + where)) {
            statement.setObject(1, projectId);
            statement.setObject(2, key);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read page " + key, ex);
        }
    }

    private List<DocPageSummary> summaries(String sql, UUID projectId, String... parameters) {
        List<DocPageSummary> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            for (int i = 0; i < parameters.length; i++) {
                statement.setString(i + 2, parameters[i]);
            }
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(new DocPageSummary(rs.getObject("id", UUID.class), rs.getString("path"),
                            rs.getString("title"), rs.getInt("version"),
                            OfficiumJson.readActor(rs.getString("updated_by")),
                            rs.getTimestamp("updated_at").toInstant(), lifecycle(rs), rs.getBoolean("template")));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the pages of " + projectId, ex);
        }
        return result;
    }

    private static DocPage map(ResultSet rs) throws SQLException {
        return new DocPage(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                rs.getString("path"), rs.getString("title"), rs.getString("body"), rs.getInt("version"),
                OfficiumJson.readActor(rs.getString("created_by")), OfficiumJson.readActor(rs.getString("updated_by")),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant(), lifecycle(rs),
                rs.getBoolean("template"), OfficiumJson.readActors(rs.getString("co_authors")));
    }

    static DocLifecycle lifecycle(ResultSet rs) throws SQLException {
        return new DocLifecycle(instant(rs, "published_at"), instant(rs, "archived_at"),
                actor(rs.getString("archived_by")), instant(rs, "deleted_at"), actor(rs.getString("deleted_by")));
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private static Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private static Actor actor(String json) {
        return json == null ? null : OfficiumJson.readActor(json);
    }

    private static String actorJson(Actor actor) {
        return actor == null ? null : OfficiumJson.writeActor(actor);
    }
}
