package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.ports.DocRedirectRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** JAVA-792: the redirects a move leaves, in {@code officium_doc_redirect}. */
@ApplicationScoped
public class JdbcDocRedirectRepository implements DocRedirectRepository {

    private final DataSource dataSource;

    public JdbcDocRedirectRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Map<String, String> currentPaths(UUID projectId, Collection<String> fromPaths) {
        Map<String, String> result = new HashMap<>();
        if (fromPaths.isEmpty()) {
            return result;
        }
        String sql = "select r.from_path, p.path from officium_doc_redirect r "
                + "join officium_doc_page p on p.id = r.page_id where r.project_id = ? and r.from_path = any(?) "
                + "and p.deleted_at is null";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            statement.setArray(2, connection.createArrayOf("text", fromPaths.toArray()));
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.put(rs.getString(1), rs.getString(2));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the redirects of " + projectId, ex);
        }
        return result;
    }
}
