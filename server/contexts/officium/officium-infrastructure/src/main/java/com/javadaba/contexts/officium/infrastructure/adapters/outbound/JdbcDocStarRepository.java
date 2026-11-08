package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocStars.Target;
import com.javadaba.contexts.officium.domain.ports.DocStarRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.UnaryOperator;

/** JAVA-799: a person's starred documentation, in {@code officium_doc_star}. Each row holds an id, never a path. */
@ApplicationScoped
public class JdbcDocStarRepository implements DocStarRepository {

    private final DataSource dataSource;

    public JdbcDocStarRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<Target> list(UUID projectId, UUID accountId) {
        try (Connection connection = dataSource.getConnection()) {
            return read(connection, projectId, accountId);
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the stars of " + accountId, ex);
        }
    }

    @Override
    public Change update(UUID projectId, UUID accountId, UnaryOperator<List<Target>> change) {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                try (PreparedStatement lock = connection.prepareStatement(
                        "select pg_advisory_xact_lock(hashtext(?), hashtext(?))")) {
                    lock.setString(1, accountId.toString());
                    lock.setString(2, projectId.toString());
                    lock.execute();
                }
                List<Target> before = read(connection, projectId, accountId);
                List<Target> after = change.apply(before);
                if (!after.equals(before)) {
                    write(connection, projectId, accountId, after);
                }
                connection.commit();
                return new Change(before, after);
            } catch (SQLException | RuntimeException ex) {
                connection.rollback();
                throw ex;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to write the stars of " + accountId, ex);
        }
    }

    /** Under the same lock as {@link #update}, so a star racing the removal cannot write the list back. */
    @Override
    public void forget(UUID projectId, UUID accountId) {
        update(projectId, accountId, order -> List.of());
    }

    private static List<Target> read(Connection connection, UUID projectId, UUID accountId) throws SQLException {
        List<Target> order = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement("select page_id, node_id from "
                + "officium_doc_star where project_id = ? and account_id = ? order by position")) {
            statement.setObject(1, projectId);
            statement.setObject(2, accountId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    order.add(new Target(rs.getObject("page_id", UUID.class), rs.getObject("node_id", UUID.class)));
                }
            }
        }
        return order;
    }

    private static void write(Connection connection, UUID projectId, UUID accountId, List<Target> order)
            throws SQLException {
        try (PreparedStatement delete = connection.prepareStatement(
                "delete from officium_doc_star where project_id = ? and account_id = ?")) {
            delete.setObject(1, projectId);
            delete.setObject(2, accountId);
            delete.executeUpdate();
        }
        try (PreparedStatement insert = connection.prepareStatement("insert into officium_doc_star "
                + "(project_id, account_id, page_id, node_id, position) values (?, ?, ?, ?, ?)")) {
            for (int position = 0; position < order.size(); position++) {
                insert.setObject(1, projectId);
                insert.setObject(2, accountId);
                insert.setObject(3, order.get(position).pageId());
                insert.setObject(4, order.get(position).nodeId());
                insert.setInt(5, position);
                insert.executeUpdate();
            }
        }
    }
}
