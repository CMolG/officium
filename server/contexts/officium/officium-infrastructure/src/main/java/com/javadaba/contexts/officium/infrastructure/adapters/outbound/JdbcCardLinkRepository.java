package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.CardLink;
import com.javadaba.contexts.officium.domain.LinkType;
import com.javadaba.contexts.officium.domain.ports.CardLinkRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class JdbcCardLinkRepository implements CardLinkRepository {

    private static final String SELECT = "select id, project_id, type, source_card_id, target_card_id, "
            + "source_card_key, target_card_key from officium_card_link";

    private static final String INSERT_SQL = "insert into officium_card_link (id, project_id, type, "
            + "source_card_id, target_card_id, source_card_key, target_card_key) values (?, ?, ?, ?, ?, ?, ?) "
            + "on conflict (project_id, type, source_card_id, target_card_id) do nothing";

    private final DataSource dataSource;

    public JdbcCardLinkRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public CardLink insert(CardLink link) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(INSERT_SQL)) {
            bindInsert(statement, link);
            statement.executeUpdate();
            return link;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert card link", ex);
        }
    }

    /** Caller-managed {@link Connection} so {@link JdbcCardBatchWriter} can run this in the same
     *  transaction as the card/comment/attachment batches. The {@code on conflict ... do nothing}
     *  clause still applies per row inside the batch. */
    void insertBatch(Connection connection, List<CardLink> linksToInsert) throws SQLException {
        if (linksToInsert.isEmpty()) {
            return;
        }
        try (PreparedStatement statement = connection.prepareStatement(INSERT_SQL)) {
            for (CardLink link : linksToInsert) {
                bindInsert(statement, link);
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static void bindInsert(PreparedStatement statement, CardLink link) throws SQLException {
        statement.setObject(1, link.id());
        statement.setObject(2, link.projectId());
        statement.setString(3, link.type().name());
        statement.setObject(4, link.sourceCardId());
        statement.setObject(5, link.targetCardId());
        statement.setString(6, link.sourceCardKey());
        statement.setString(7, link.targetCardKey());
    }

    @Override
    public List<CardLink> findAllBlocksEdges(UUID projectId) {
        return query(SELECT + " where project_id = ? and type = 'BLOCKS'", projectId);
    }

    @Override
    public List<CardLink> findByCard(UUID cardId) {
        List<CardLink> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where source_card_id = ? or target_card_id = ?")) {
            statement.setObject(1, cardId);
            statement.setObject(2, cardId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list links for card " + cardId, ex);
        }
        return result;
    }

    @Override
    public List<CardLink> findByCards(java.util.Collection<UUID> cardIds) {
        if (cardIds.isEmpty()) {
            return List.of();
        }
        List<CardLink> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where source_card_id = any (?) or target_card_id = any (?)")) {
            java.sql.Array ids = connection.createArrayOf("uuid", cardIds.toArray());
            statement.setArray(1, ids);
            statement.setArray(2, ids);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list links for " + cardIds.size() + " cards", ex);
        }
        return result;
    }

    @Override
    public void delete(UUID projectId, UUID cardId, LinkType type, UUID otherCardId) {
        String sql = "delete from officium_card_link where project_id = ? and type = ? and "
                + "((source_card_id = ? and target_card_id = ?) or (source_card_id = ? and target_card_id = ?))";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            statement.setString(2, type.name());
            statement.setObject(3, cardId);
            statement.setObject(4, otherCardId);
            statement.setObject(5, otherCardId);
            statement.setObject(6, cardId);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to delete card link", ex);
        }
    }

    @Override
    public void deleteAllForCard(UUID cardId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_card_link where source_card_id = ? or target_card_id = ?")) {
            statement.setObject(1, cardId);
            statement.setObject(2, cardId);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to delete links for card " + cardId, ex);
        }
    }

    private List<CardLink> query(String sql, UUID projectId) {
        List<CardLink> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to query card links for " + projectId, ex);
        }
        return result;
    }

    private static CardLink map(ResultSet rs) throws SQLException {
        return new CardLink(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                LinkType.valueOf(rs.getString("type")), rs.getObject("source_card_id", UUID.class),
                rs.getObject("target_card_id", UUID.class), rs.getString("source_card_key"),
                rs.getString("target_card_key"));
    }
}
