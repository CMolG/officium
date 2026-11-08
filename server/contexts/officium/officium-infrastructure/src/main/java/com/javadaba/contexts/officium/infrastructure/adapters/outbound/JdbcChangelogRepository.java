package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.ChangelogEntry;
import com.javadaba.contexts.officium.domain.ChangelogToken;
import com.javadaba.contexts.officium.domain.DocsStatus;
import com.javadaba.contexts.officium.domain.ports.ChangelogRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Array;
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
public class JdbcChangelogRepository implements ChangelogRepository {

    private static final String SELECT = "select id, project_id, ref, title, url, areas, merged_at, status, pages, "
            + "recorded_by, recorded_at, marked_by, marked_at, version from officium_changelog_entry";

    private final DataSource dataSource;

    public JdbcChangelogRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<ChangelogEntry> list(UUID projectId, DocsStatus status, int limit) {
        String sql = SELECT + " where project_id = ?" + (status == null ? "" : " and status = ?")
                + " order by merged_at desc, recorded_at desc limit ?";
        List<ChangelogEntry> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            int i = 1;
            statement.setObject(i++, projectId);
            if (status != null) {
                statement.setString(i++, status.wire());
            }
            statement.setInt(i, limit);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the changelog of " + projectId, ex);
        }
        return result;
    }

    @Override
    public int countPending(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select count(*) from officium_changelog_entry where project_id = ? and status = 'pending'")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to count the pending changes of " + projectId, ex);
        }
    }

    @Override
    public Optional<ChangelogEntry> find(UUID projectId, UUID entryId) {
        return one(SELECT + " where project_id = ? and id = ?", projectId, entryId);
    }

    @Override
    public Optional<ChangelogEntry> findByRef(UUID projectId, String ref) {
        return one(SELECT + " where project_id = ? and ref = ?", projectId, ref);
    }

    @Override
    public boolean insert(ChangelogEntry entry) {
        String sql = "insert into officium_changelog_entry (id, project_id, ref, title, url, areas, merged_at, status, "
                + "pages, recorded_by, recorded_at, marked_by, marked_at, version) values (?, ?, ?, ?, ?, ?, ?, ?, ?, "
                + "cast(? as jsonb), ?, cast(? as jsonb), ?, ?)";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, entry.id());
            statement.setObject(2, entry.projectId());
            statement.setString(3, entry.ref());
            statement.setString(4, entry.title());
            statement.setString(5, entry.url());
            statement.setArray(6, connection.createArrayOf("text", entry.areas().toArray()));
            statement.setTimestamp(7, Timestamp.from(entry.mergedAt()));
            statement.setString(8, entry.status().wire());
            statement.setArray(9, connection.createArrayOf("text", entry.pages().toArray()));
            statement.setString(10, OfficiumJson.writeActor(entry.recordedBy()));
            statement.setTimestamp(11, Timestamp.from(entry.recordedAt()));
            statement.setString(12, entry.markedBy() == null ? null : OfficiumJson.writeActor(entry.markedBy()));
            statement.setTimestamp(13, entry.markedAt() == null ? null : Timestamp.from(entry.markedAt()));
            statement.setInt(14, entry.version());
            statement.executeUpdate();
            return true;
        } catch (SQLException ex) {
            // uq_officium_changelog_entry_ref: the same change was recorded in between.
            if ("23505".equals(ex.getSQLState())) {
                return false;
            }
            throw new IllegalStateException("Unable to record change " + entry.ref(), ex);
        }
    }

    @Override
    public boolean updateMarkIfVersion(ChangelogEntry entry, int expectedVersion) {
        String sql = "update officium_changelog_entry set status = ?, pages = ?, marked_by = cast(? as jsonb), "
                + "marked_at = ?, version = ? where project_id = ? and id = ? and version = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, entry.status().wire());
            statement.setArray(2, connection.createArrayOf("text", entry.pages().toArray()));
            statement.setString(3, entry.markedBy() == null ? null : OfficiumJson.writeActor(entry.markedBy()));
            statement.setTimestamp(4, entry.markedAt() == null ? null : Timestamp.from(entry.markedAt()));
            statement.setInt(5, entry.version());
            statement.setObject(6, entry.projectId());
            statement.setObject(7, entry.id());
            statement.setInt(8, expectedVersion);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to mark change " + entry.ref(), ex);
        }
    }

    @Override
    public Optional<ChangelogToken> token(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select token_hash, created_by, created_at from officium_changelog_token where project_id = ?")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next()
                        ? Optional.of(new ChangelogToken(projectId, rs.getString("token_hash"),
                                OfficiumJson.readActor(rs.getString("created_by")),
                                rs.getTimestamp("created_at").toInstant()))
                        : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the pipeline token of " + projectId, ex);
        }
    }

    @Override
    public void saveToken(ChangelogToken token) {
        String sql = "insert into officium_changelog_token (project_id, token_hash, created_by, created_at) "
                + "values (?, ?, cast(? as jsonb), ?) on conflict (project_id) do update set "
                + "token_hash = excluded.token_hash, created_by = excluded.created_by, created_at = excluded.created_at";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, token.projectId());
            statement.setString(2, token.tokenHash());
            statement.setString(3, OfficiumJson.writeActor(token.createdBy()));
            statement.setTimestamp(4, Timestamp.from(token.createdAt()));
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the pipeline token of " + token.projectId(), ex);
        }
    }

    @Override
    public boolean deleteToken(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_changelog_token where project_id = ?")) {
            statement.setObject(1, projectId);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to revoke the pipeline token of " + projectId, ex);
        }
    }

    @Override
    public Optional<UUID> projectForTokenHash(String tokenHash) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select project_id from officium_changelog_token where token_hash = ?")) {
            statement.setString(1, tokenHash);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(rs.getObject("project_id", UUID.class)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to resolve a pipeline token", ex);
        }
    }

    private Optional<ChangelogEntry> one(String sql, UUID projectId, Object key) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            statement.setObject(2, key);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read change " + key, ex);
        }
    }

    private static ChangelogEntry map(ResultSet rs) throws SQLException {
        String markedBy = rs.getString("marked_by");
        Timestamp markedAt = rs.getTimestamp("marked_at");
        return new ChangelogEntry(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                rs.getString("ref"), rs.getString("title"), rs.getString("url"), strings(rs.getArray("areas")),
                rs.getTimestamp("merged_at").toInstant(), DocsStatus.fromWire(rs.getString("status")),
                strings(rs.getArray("pages")), OfficiumJson.readActor(rs.getString("recorded_by")),
                rs.getTimestamp("recorded_at").toInstant(), markedBy == null ? null : OfficiumJson.readActor(markedBy),
                markedAt == null ? null : markedAt.toInstant(), rs.getInt("version"));
    }

    private static List<String> strings(Array array) throws SQLException {
        return array == null ? List.of() : List.of((String[]) array.getArray());
    }
}
