package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocFileRefs;
import com.javadaba.contexts.officium.domain.DocPage;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** The stored bytes of one page's files, by name: what a version weighs on top of its text (JAVA-798). */
record DocAttachmentWeights(Map<String, Long> storedBytesByName) {

    static DocAttachmentWeights of(Connection connection, UUID pageId) throws SQLException {
        Map<String, Long> files = new HashMap<>();
        try (PreparedStatement statement = connection.prepareStatement(
                "select name, stored_bytes from officium_doc_attachment where page_id = ?")) {
            statement.setObject(1, pageId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    files.put(rs.getString(1), rs.getLong(2));
                }
            }
        }
        return new DocAttachmentWeights(files);
    }

    /** The stored bytes of this page's own files its body references. */
    long referencedBy(DocPage page) {
        if (storedBytesByName.isEmpty()) {
            return 0;
        }
        return DocFileRefs.in(page.body()).stream().filter(ref -> ref.pagePath().equals(page.path()))
                .mapToLong(ref -> storedBytesByName.getOrDefault(ref.name(), 0L)).sum();
    }
}
