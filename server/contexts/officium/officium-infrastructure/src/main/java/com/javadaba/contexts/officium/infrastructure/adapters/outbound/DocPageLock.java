package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocPage;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;

/** Locks a page row for the length of a save that keeps its history (JAVA-794). */
final class DocPageLock {

    private DocPageLock() {
    }

    /** @return the page as stored, or null when it is gone. */
    static DocPage of(Connection connection, UUID pageId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "select id, project_id, path, title, body, version, created_by, updated_by, created_at, updated_at "
                        + "from officium_doc_page where id = ? for update")) {
            statement.setObject(1, pageId);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return null;
                }
                return new DocPage(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                        rs.getString("path"), rs.getString("title"), rs.getString("body"), rs.getInt("version"),
                        OfficiumJson.readActor(rs.getString("created_by")),
                        OfficiumJson.readActor(rs.getString("updated_by")),
                        rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
            }
        }
    }
}
