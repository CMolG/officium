package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocStorage;
import com.javadaba.contexts.officium.domain.ports.StorageUsageRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;

/**
 * Sums, in the database, the same UTF-8 measure {@code StorageUsage.bytesOf} applies to a write
 * ({@code octet_length} is bytes, not characters). Soft-deleted cards are left out, so deleting a
 * card gives its space back; archived projects still count, because their data is still kept.
 * Documentation pages (JAVA-130) and the changelog's entries (JAVA-132) count like card text; a page's files count their stored bytes (JAVA-798).
 */
@ApplicationScoped
public class JdbcStorageUsageRepository implements StorageUsageRepository {

    private static final String SQL = """
            with owned as (
              select c.id, c.title, c.description, c.action_plan, c.epic, c.tags
                from officium_card c
                join officium_project p on p.id = c.project_id
               where p.owner_account_id = ? and c.deleted_at is null
            )
            select
              (select coalesce(sum(octet_length(title) + coalesce(octet_length(description), 0)
                        + coalesce(octet_length(action_plan), 0)
                        + coalesce(octet_length(epic), 0) + octet_length(array_to_string(tags, ''))), 0)
                 from owned)
            + (select coalesce(sum(octet_length(m.text)), 0)
                 from officium_card_comment m join owned o on o.id = m.card_id)
            + (select coalesce(sum(octet_length(t.who) + coalesce(octet_length(t.note), 0)), 0)
                 from officium_card_time_entry t join owned o on o.id = t.card_id)
            + (select coalesce(sum(octet_length(a.name) + octet_length(a.path)), 0)
                 from officium_card_attachment a join owned o on o.id = a.card_id)
            + (select coalesce(sum(octet_length(d.path) + octet_length(d.title) + octet_length(d.body)), 0)
                 from officium_doc_page d
                 join officium_project p on p.id = d.project_id
                where p.owner_account_id = ?)
            + (select coalesce(sum(octet_length(v.title) + octet_length(v.body)), 0)
                 from officium_doc_revision v
                 join officium_project p on p.id = v.project_id
                where p.owner_account_id = ?)
            + (select coalesce(sum(f.stored_bytes), 0)
                 from officium_doc_attachment f
                 join officium_project p on p.id = f.project_id
                where p.owner_account_id = ?)
            + (select coalesce(sum(octet_length(k.text) + coalesce(octet_length(k.quote_exact), 0)
                        + coalesce(octet_length(k.quote_prefix), 0) + coalesce(octet_length(k.quote_suffix), 0)), 0)
                 from officium_doc_comment k
                 join officium_doc_page d on d.id = k.page_id
                 join officium_project p on p.id = d.project_id
                where p.owner_account_id = ?)
            + (select coalesce(sum(octet_length(e.ref) + octet_length(e.title) + coalesce(octet_length(e.url), 0)
                        + octet_length(array_to_string(e.areas, '')) + octet_length(array_to_string(e.pages, ''))), 0)
                 from officium_changelog_entry e
                 join officium_project p on p.id = e.project_id
                where p.owner_account_id = ?)
            + (select coalesce(sum(octet_length(r.ref) + octet_length(r.branch) + octet_length(r.machine)), 0)
                 from officium_test_run r
                 join officium_project p on p.id = r.project_id
                where p.owner_account_id = ?)
            + (select coalesce(sum(octet_length(s.name)), 0)
                 from officium_test_suite_result s
                 join officium_test_run r on r.id = s.run_id
                 join officium_project p on p.id = r.project_id
                where p.owner_account_id = ?)
            """;

    private static final String DOCS = """
            select
              coalesce(sum(octet_length(path) + octet_length(title) + octet_length(body))
                filter (where deleted_at is null), 0),
              (select coalesce(sum(octet_length(title) + octet_length(body)), 0)
                 from officium_doc_revision where project_id = ?),
              (select coalesce(sum(stored_bytes), 0) from officium_doc_attachment where project_id = ?),
              coalesce(sum(octet_length(path) + octet_length(title) + octet_length(body))
                filter (where deleted_at is not null), 0),
              (select coalesce(sum(octet_length(k.text) + coalesce(octet_length(k.quote_exact), 0)
                        + coalesce(octet_length(k.quote_prefix), 0) + coalesce(octet_length(k.quote_suffix), 0)), 0)
                 from officium_doc_comment k join officium_doc_page d on d.id = k.page_id
                where d.project_id = ?)
            from officium_doc_page where project_id = ?
            """;

    private final DataSource dataSource;

    public JdbcStorageUsageRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public long textBytesOwnedBy(UUID ownerAccountId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(SQL)) {
            for (int i = 1; i <= 8; i++) {
                statement.setObject(i, ownerAccountId);
            }
            try (ResultSet rs = statement.executeQuery()) {
                rs.next();
                return rs.getLong(1);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to measure storage for " + ownerAccountId, ex);
        }
    }

    @Override
    public DocStorage docStorageOf(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(DOCS)) {
            for (int i = 1; i <= 4; i++) {
                statement.setObject(i, projectId);
            }
            try (ResultSet rs = statement.executeQuery()) {
                rs.next();
                return new DocStorage(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4), rs.getLong(5));
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to measure the documentation of " + projectId, ex);
        }
    }
}
