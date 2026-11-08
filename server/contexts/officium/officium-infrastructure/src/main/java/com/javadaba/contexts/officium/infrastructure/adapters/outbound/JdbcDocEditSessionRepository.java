package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocEditSession;
import com.javadaba.contexts.officium.domain.ports.DocEditSessionRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JdbcDocEditSessionRepository implements DocEditSessionRepository {

    private final DataSource dataSource;

    public JdbcDocEditSessionRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Optional<DocEditSession> find(UUID pageId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select session_id, author, checkpoint_at from officium_doc_edit_session where page_id = ?")) {
            statement.setObject(1, pageId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next()
                        ? Optional.of(new DocEditSession(rs.getString("session_id"),
                                OfficiumJson.readActor(rs.getString("author")),
                                rs.getTimestamp("checkpoint_at").toInstant()))
                        : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the edit session of " + pageId, ex);
        }
    }

    @Override
    public void save(UUID pageId, DocEditSession session) {
        String sql = session == null
                ? "delete from officium_doc_edit_session where page_id = ?"
                : "insert into officium_doc_edit_session (page_id, session_id, author, checkpoint_at) "
                        + "values (?, ?, cast(? as jsonb), ?) on conflict (page_id) do update set "
                        + "session_id = excluded.session_id, author = excluded.author, "
                        + "checkpoint_at = excluded.checkpoint_at";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, pageId);
            if (session != null) {
                statement.setString(2, session.id());
                statement.setString(3, OfficiumJson.writeActor(session.author()));
                statement.setTimestamp(4, Timestamp.from(session.checkpointAt()));
            }
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the edit session of " + pageId, ex);
        }
    }
}
