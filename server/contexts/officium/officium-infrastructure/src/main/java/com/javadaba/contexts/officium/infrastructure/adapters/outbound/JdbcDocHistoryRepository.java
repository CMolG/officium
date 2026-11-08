package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocHistoryPolicy;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.DocRevision;
import com.javadaba.contexts.officium.domain.DocSettings;
import com.javadaba.contexts.officium.domain.StorageUsage;
import com.javadaba.contexts.officium.domain.ports.DocHistoryRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * The page history (JAVA-794). The write that replaces a page runs in one transaction: the page row
 * is locked and version-checked first, then its revisions are locked, the pure
 * {@link DocHistoryPolicy} decides, and the rows follow.
 */
@ApplicationScoped
public class JdbcDocHistoryRepository implements DocHistoryRepository {

    private static final String COLUMNS = "id, project_id, page_id, version, title, body, weight_bytes, author, "
            + "written_at, retired_at, heaviest";

    private final DataSource dataSource;

    public JdbcDocHistoryRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<DocRevision> revisions(UUID pageId) {
        try (Connection connection = dataSource.getConnection()) {
            return readRevisions(connection, pageId, "");
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the history of " + pageId, ex);
        }
    }

    @Override
    public Optional<DocRevision> revision(UUID pageId, UUID revisionId) {
        return revisions(pageId).stream().filter(revision -> revision.id().equals(revisionId)).findFirst();
    }

    @Override
    public SaveResult updateKeepingHistory(DocPage edited, int expectedVersion, long historyRoom, int historyDays,
            Instant now) {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                SaveResult result = save(connection, edited, expectedVersion, historyRoom, historyDays, now);
                if (result.updated()) {
                    connection.commit();
                } else {
                    connection.rollback();
                }
                return result;
            } catch (SQLException | RuntimeException ex) {
                connection.rollback();
                throw ex;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to update page " + edited.path(), ex);
        }
    }

    private SaveResult save(Connection connection, DocPage edited, int expectedVersion, long historyRoom,
            int historyDays, Instant now) throws SQLException {
        DocPage current = DocPageLock.of(connection, edited.id());
        if (current == null || current.version() != expectedVersion) {
            return new SaveResult(false, false, null);
        }
        // Trashing never bumps the version (JAVA-793), so only deleted_at tells a page trashed since it was read.
        try (PreparedStatement update = connection.prepareStatement(
                "update officium_doc_page set title = ?, body = ?, version = ?, updated_by = cast(? as jsonb), "
                        + "updated_at = ?, co_authors = cast(? as jsonb) where id = ? and deleted_at is null")) {
            update.setString(1, edited.title());
            update.setString(2, edited.body());
            update.setInt(3, edited.version());
            update.setString(4, OfficiumJson.writeActor(edited.updatedBy()));
            update.setTimestamp(5, Timestamp.from(edited.updatedAt()));
            update.setString(6, OfficiumJson.writeActors(edited.coAuthors()));
            update.setObject(7, edited.id());
            if (update.executeUpdate() != 1) {
                return new SaveResult(false, false, null);
            }
        }
        // The page's links change with its text, in the same transaction (JAVA-792): backlinks never lag an edit.
        DocLinkWrites.replace(connection, edited);
        List<DocRevision> kept = readRevisions(connection, edited.id(), " for update");
        DocAttachmentWeights files = DocAttachmentWeights.of(connection, edited.id());
        DocRevision retiring = DocRevision.retiring(current, now)
                .withWeightBytes(StorageUsage.bytesOf(current.title(), current.body()) + files.referencedBy(current));
        long weight = StorageUsage.bytesOf(edited.title(), edited.body()) + files.referencedBy(edited);
        var outcome = DocHistoryPolicy.apply(kept, retiring, weight, historyDays, now);
        boolean retiringKept = outcome.kept().stream().anyMatch(r -> r.id().equals(retiring.id()));
        long freed = outcome.dropped().stream().filter(r -> !r.id().equals(retiring.id()))
                .mapToLong(DocRevision::bytes).sum();
        boolean noRoom = retiringKept && retiring.bytes() - freed > historyRoom;
        if (noRoom) {
            outcome = DocHistoryPolicy.apply(kept, null, weight, historyDays, now);
            retiringKept = false;
        }
        apply(connection, kept, outcome, retiring);
        return new SaveResult(true, !noRoom, retiringKept ? retiring.id() : null);
    }

    private void apply(Connection connection, List<DocRevision> stored, DocHistoryPolicy.Outcome outcome,
            DocRevision retiring) throws SQLException {
        Set<UUID> storedIds = new HashSet<>();
        for (DocRevision revision : stored) {
            storedIds.add(revision.id());
        }
        for (DocRevision dropped : outcome.dropped()) {
            if (storedIds.contains(dropped.id())) {
                deleteById(connection, dropped.id());
            }
        }
        for (DocRevision revision : outcome.kept()) {
            if (retiring != null && revision.id().equals(retiring.id())) {
                insert(connection, revision);
            } else {
                DocRevision before = stored.stream().filter(s -> s.id().equals(revision.id())).findFirst()
                        .orElseThrow();
                if (before.heaviest() != revision.heaviest()) {
                    try (PreparedStatement flag = connection.prepareStatement(
                            "update officium_doc_revision set heaviest = ? where id = ?")) {
                        flag.setBoolean(1, revision.heaviest());
                        flag.setObject(2, revision.id());
                        flag.executeUpdate();
                    }
                }
            }
        }
    }

    @Override
    public boolean deleteRevision(UUID pageId, UUID revisionId, int historyDays, Instant now) {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                DocPage page = DocPageLock.of(connection, pageId);
                List<DocRevision> kept = readRevisions(connection, pageId, " for update");
                if (page == null || kept.stream().noneMatch(r -> r.id().equals(revisionId))) {
                    connection.rollback();
                    return false;
                }
                deleteById(connection, revisionId);
                List<DocRevision> left = kept.stream().filter(r -> !r.id().equals(revisionId)).toList();
                var outcome = DocHistoryPolicy.apply(left, null, StorageUsage.bytesOf(page.title(), page.body()),
                        historyDays, now);
                apply(connection, left, outcome, null);
                connection.commit();
                return true;
            } catch (SQLException | RuntimeException ex) {
                connection.rollback();
                throw ex;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to delete revision " + revisionId, ex);
        }
    }

    @Override
    public DocSettings settings(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select history_days, version, updated_by, updated_at from officium_doc_settings "
                                + "where project_id = ?")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return DocSettings.defaults(projectId);
                }
                return new DocSettings(projectId, rs.getInt("history_days"), rs.getInt("version"),
                        OfficiumJson.readActor(rs.getString("updated_by")), rs.getTimestamp("updated_at").toInstant());
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the documentation settings of " + projectId, ex);
        }
    }

    @Override
    public boolean saveSettings(DocSettings settings, int expectedVersion, Instant now) {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                boolean saved = expectedVersion == 0
                        ? insertSettings(connection, settings)
                        : updateSettings(connection, settings, expectedVersion);
                if (!saved) {
                    connection.rollback();
                    return false;
                }
                try (PreparedStatement expire = connection.prepareStatement(
                        "delete from officium_doc_revision where project_id = ? and not heaviest "
                                + "and retired_at < cast(? as timestamptz) - make_interval(days => ?)")) {
                    expire.setObject(1, settings.projectId());
                    expire.setTimestamp(2, Timestamp.from(now));
                    expire.setInt(3, settings.historyDays());
                    expire.executeUpdate();
                }
                connection.commit();
                return true;
            } catch (SQLException | RuntimeException ex) {
                connection.rollback();
                throw ex;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the documentation settings", ex);
        }
    }

    private static boolean insertSettings(Connection connection, DocSettings settings) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "insert into officium_doc_settings (project_id, history_days, version, updated_by, updated_at) "
                        + "values (?, ?, ?, cast(? as jsonb), ?) on conflict do nothing")) {
            statement.setObject(1, settings.projectId());
            statement.setInt(2, settings.historyDays());
            statement.setInt(3, settings.version());
            statement.setString(4, OfficiumJson.writeActor(settings.updatedBy()));
            statement.setTimestamp(5, Timestamp.from(settings.updatedAt()));
            return statement.executeUpdate() == 1;
        }
    }

    private static boolean updateSettings(Connection connection, DocSettings settings, int expectedVersion)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "update officium_doc_settings set history_days = ?, version = ?, updated_by = cast(? as jsonb), "
                        + "updated_at = ? where project_id = ? and version = ?")) {
            statement.setInt(1, settings.historyDays());
            statement.setInt(2, settings.version());
            statement.setString(3, OfficiumJson.writeActor(settings.updatedBy()));
            statement.setTimestamp(4, Timestamp.from(settings.updatedAt()));
            statement.setObject(5, settings.projectId());
            statement.setInt(6, expectedVersion);
            return statement.executeUpdate() == 1;
        }
    }

    @Override
    public int sweepExpired(Instant now) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_doc_revision r where not r.heaviest and r.retired_at < cast(? as timestamptz) - "
                                + "make_interval(days => coalesce((select s.history_days from officium_doc_settings s "
                                + "where s.project_id = r.project_id), " + DocSettings.DEFAULT_HISTORY_DAYS + "))")) {
            statement.setTimestamp(1, Timestamp.from(now));
            return statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to sweep the page history", ex);
        }
    }

    private static List<DocRevision> readRevisions(Connection connection, UUID pageId, String lock)
            throws SQLException {
        List<DocRevision> result = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement("select " + COLUMNS
                + " from officium_doc_revision where page_id = ? order by version desc" + lock)) {
            statement.setObject(1, pageId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(new DocRevision(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                            rs.getObject("page_id", UUID.class), rs.getInt("version"), rs.getString("title"),
                            rs.getString("body"), rs.getLong("weight_bytes"),
                            OfficiumJson.readActor(rs.getString("author")), rs.getTimestamp("written_at").toInstant(),
                            rs.getTimestamp("retired_at").toInstant(), rs.getBoolean("heaviest")));
                }
            }
        }
        return result;
    }

    private static void insert(Connection connection, DocRevision revision) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("insert into officium_doc_revision ("
                + COLUMNS + ") values (?, ?, ?, ?, ?, ?, ?, cast(? as jsonb), ?, ?, ?)")) {
            statement.setObject(1, revision.id());
            statement.setObject(2, revision.projectId());
            statement.setObject(3, revision.pageId());
            statement.setInt(4, revision.version());
            statement.setString(5, revision.title());
            statement.setString(6, revision.body());
            statement.setLong(7, revision.weightBytes());
            statement.setString(8, OfficiumJson.writeActor(revision.author()));
            statement.setTimestamp(9, Timestamp.from(revision.writtenAt()));
            statement.setTimestamp(10, Timestamp.from(revision.retiredAt()));
            statement.setBoolean(11, revision.heaviest());
            statement.executeUpdate();
        }
    }

    private static void deleteById(Connection connection, UUID id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "delete from officium_doc_revision where id = ?")) {
            statement.setObject(1, id);
            statement.executeUpdate();
        }
    }
}
