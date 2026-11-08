package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocLinks;
import com.javadaba.contexts.officium.domain.DocPage;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

/** JAVA-792: rewrites one page's rows of {@code officium_doc_link}, inside the caller's transaction. */
final class DocLinkWrites {

    private DocLinkWrites() {
    }

    /** The page's own links, read from its body as it now stands. */
    static void replace(Connection connection, DocPage page) throws SQLException {
        replace(connection, page.projectId(), page.id(), page.version(), DocLinks.extract(page.path(), page.body()));
    }

    static void replace(Connection connection, UUID projectId, UUID pageId, int version, List<DocLinks.Ref> refs)
            throws SQLException {
        try (PreparedStatement delete = connection.prepareStatement(
                "delete from officium_doc_link where from_page_id = ?")) {
            delete.setObject(1, pageId);
            delete.executeUpdate();
        }
        try (PreparedStatement insert = connection.prepareStatement("insert into officium_doc_link "
                + "(project_id, from_page_id, to_path, line) values (?, ?, ?, ?)")) {
            for (DocLinks.Ref ref : refs) {
                insert.setObject(1, projectId);
                insert.setObject(2, pageId);
                insert.setString(3, ref.path());
                insert.setInt(4, ref.line());
                insert.addBatch();
            }
            insert.executeBatch();
        }
        try (PreparedStatement mark = connection.prepareStatement(
                "update officium_doc_page set links_version = ? where id = ?")) {
            mark.setInt(1, version);
            mark.setObject(2, pageId);
            mark.executeUpdate();
        }
    }
}
