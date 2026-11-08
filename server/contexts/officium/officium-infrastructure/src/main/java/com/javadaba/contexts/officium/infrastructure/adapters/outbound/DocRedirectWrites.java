package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocPage;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

/** The redirect writes a page's insert makes, in its transaction (JAVA-792). */
final class DocRedirectWrites {

    private DocRedirectWrites() {
    }

    /** A page written at a redirected path replaces the redirect. */
    static void drop(Connection connection, DocPage page) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "delete from officium_doc_redirect where project_id = ? and from_path = ?")) {
            statement.setObject(1, page.projectId());
            statement.setString(2, page.path());
            statement.executeUpdate();
        }
    }
}
