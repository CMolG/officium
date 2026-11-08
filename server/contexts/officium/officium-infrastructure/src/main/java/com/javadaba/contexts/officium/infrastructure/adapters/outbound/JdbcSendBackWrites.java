package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.ReviewReturn;
import com.javadaba.contexts.officium.domain.ReviewReturnReason;
import com.javadaba.contexts.officium.domain.SendBack;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;

/** Writes a send-back (card://JAVA-1416) in the connection of the move that makes it. */
final class JdbcSendBackWrites {

    private static final String INSERT = "insert into officium_card_review_return (id, project_id, card_id, "
            + "returned_at, actor, role, from_status, to_status, reasons, comment_id) "
            + "values (?, ?, ?, ?, cast(? as jsonb), ?, ?, ?, cast(? as text[]), ?)";

    private JdbcSendBackWrites() {
    }

    /** The findings comment first: the entry points at it. */
    static void write(Connection connection, SendBack sendBack) throws SQLException {
        JdbcCardCommentRepository.insertBatch(connection, List.of(sendBack.findings()));
        ReviewReturn entry = sendBack.entry();
        try (PreparedStatement statement = connection.prepareStatement(INSERT)) {
            statement.setObject(1, entry.id());
            statement.setObject(2, entry.projectId());
            statement.setObject(3, entry.cardId());
            statement.setTimestamp(4, Timestamp.from(entry.at()));
            statement.setString(5, OfficiumJson.writeActor(entry.actor()));
            statement.setString(6, entry.role());
            statement.setString(7, entry.from().wire());
            statement.setString(8, entry.to().wire());
            statement.setString(9, arrayLiteral(entry.reasons()));
            statement.setObject(10, entry.commentId());
            statement.executeUpdate();
        }
    }

    /** Reason ids are lowercase words and hyphens, so a Postgres array literal needs no escaping. */
    private static String arrayLiteral(List<ReviewReturnReason> reasons) {
        return "{" + String.join(",", reasons.stream().map(ReviewReturnReason::wire).toList()) + "}";
    }
}
