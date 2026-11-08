package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.ports.DocViewRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** JAVA-799: the pages a person opened, in {@code officium_doc_view}: one row per page, bounded per project. */
@ApplicationScoped
public class JdbcDocViewRepository implements DocViewRepository {

    private final DataSource dataSource;

    public JdbcDocViewRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void record(UUID projectId, UUID accountId, UUID pageId, Instant at, int keep) {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                try (PreparedStatement upsert = connection.prepareStatement("insert into officium_doc_view "
                        + "(account_id, page_id, project_id, viewed_at) values (?, ?, ?, ?) "
                        + "on conflict (account_id, page_id) do update set viewed_at = excluded.viewed_at")) {
                    upsert.setObject(1, accountId);
                    upsert.setObject(2, pageId);
                    upsert.setObject(3, projectId);
                    upsert.setTimestamp(4, Timestamp.from(at));
                    upsert.executeUpdate();
                }
                try (PreparedStatement trim = connection.prepareStatement("delete from officium_doc_view "
                        + "where project_id = ? and account_id = ? and page_id not in (select page_id from "
                        + "officium_doc_view where project_id = ? and account_id = ? "
                        + "order by viewed_at desc, page_id limit ?)")) {
                    trim.setObject(1, projectId);
                    trim.setObject(2, accountId);
                    trim.setObject(3, projectId);
                    trim.setObject(4, accountId);
                    trim.setInt(5, keep);
                    trim.executeUpdate();
                }
                connection.commit();
            } catch (SQLException ex) {
                connection.rollback();
                throw ex;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to record a view of " + pageId, ex);
        }
    }

    @Override
    public List<View> recent(UUID projectId, UUID accountId, int limit) {
        List<View> views = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement("select page_id, viewed_at from "
                        + "officium_doc_view where project_id = ? and account_id = ? "
                        + "order by viewed_at desc, page_id limit ?")) {
            statement.setObject(1, projectId);
            statement.setObject(2, accountId);
            statement.setInt(3, limit);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    views.add(new View(rs.getObject("page_id", UUID.class), rs.getTimestamp("viewed_at").toInstant()));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the views of " + accountId, ex);
        }
        return views;
    }

    @Override
    public void forget(UUID projectId, UUID accountId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement delete = connection.prepareStatement(
                        "delete from officium_doc_view where project_id = ? and account_id = ?")) {
            delete.setObject(1, projectId);
            delete.setObject(2, accountId);
            delete.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to erase the views of " + accountId, ex);
        }
    }
}
