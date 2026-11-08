package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.ports.CardWorkflowWriter;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;

/** One conditional update of the workflow column, the version and the stamp, the way {@link JdbcCardRepository} writes. */
@ApplicationScoped
public class JdbcCardWorkflowWriter implements CardWorkflowWriter {

    private static final String SQL = "update officium_card set workflow = cast(? as jsonb), version = ?, "
            + "updated_at = ?, updated_by = cast(? as jsonb), human_edited_at = ?, "
            + "human_edited_by = cast(? as jsonb), human_edit_reviewed_at = ? "
            + "where id = ? and project_id = ? and version = ? and deleted_at is null";

    private final DataSource dataSource;

    public JdbcCardWorkflowWriter(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public boolean updateIfVersion(Card updated, int expectedVersion) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(SQL)) {
            statement.setString(1, CardWorkflowJson.write(updated.workflow()));
            statement.setInt(2, updated.version());
            statement.setTimestamp(3, Timestamp.from(updated.updatedAt()));
            statement.setString(4, OfficiumJson.writeActor(updated.updatedBy()));
            CardRows.bindHumanEdit(statement, 5, updated.humanEdit());
            statement.setObject(8, updated.id());
            statement.setObject(9, updated.projectId());
            statement.setInt(10, expectedVersion);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to write the workflow of " + updated.key(), ex);
        }
    }
}
