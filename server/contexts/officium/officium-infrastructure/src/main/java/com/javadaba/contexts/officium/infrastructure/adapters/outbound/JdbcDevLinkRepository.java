package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.github.DevLink;
import com.javadaba.contexts.officium.domain.ports.DevLinkRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JdbcDevLinkRepository implements DevLinkRepository {

    private static final String SELECT = "select id, project_id, card_id, kind, repo, ref, url, title, author, state, "
            + "created_at, updated_at from officium_card_dev_link";

    private final DataSource dataSource;

    public JdbcDevLinkRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Optional<DevLink> find(UUID cardId, DevLink.Kind kind, String repo, String ref) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where card_id = ? and kind = ? and repo = ? and ref = ?")) {
            statement.setObject(1, cardId);
            statement.setString(2, kind.wire());
            statement.setString(3, repo);
            statement.setString(4, ref);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the dev link " + ref + " of card " + cardId, ex);
        }
    }

    @Override
    public void upsert(DevLink link) {
        String sql = "insert into officium_card_dev_link (id, project_id, card_id, kind, repo, ref, url, title, author, "
                + "state, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
                + "on conflict (card_id, kind, repo, ref) do update set url = excluded.url, title = excluded.title, "
                + "author = excluded.author, state = excluded.state, updated_at = excluded.updated_at";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, link.id());
            statement.setObject(2, link.projectId());
            statement.setObject(3, link.cardId());
            statement.setString(4, link.kind().wire());
            statement.setString(5, link.repo());
            statement.setString(6, link.ref());
            statement.setString(7, link.url());
            statement.setString(8, link.title());
            statement.setString(9, link.author());
            statement.setString(10, link.state().wire());
            statement.setTimestamp(11, Timestamp.from(link.createdAt()));
            statement.setTimestamp(12, Timestamp.from(link.updatedAt()));
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the dev link " + link.ref() + " of card " + link.cardId(),
                    ex);
        }
    }

    @Override
    public List<DevLink> listByCard(UUID cardId) {
        List<DevLink> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where card_id = ? order by updated_at desc, created_at desc")) {
            statement.setObject(1, cardId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the dev links of card " + cardId, ex);
        }
        return result;
    }

    @Override
    public int closeBranch(UUID projectId, String repo, String branch, Instant at) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "update officium_card_dev_link set state = 'closed', updated_at = ? where project_id = ? "
                                + "and kind = 'branch' and repo = ? and ref = ? and state <> 'closed'")) {
            statement.setTimestamp(1, Timestamp.from(at));
            statement.setObject(2, projectId);
            statement.setString(3, repo);
            statement.setString(4, branch);
            return statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to close branch " + branch + " of " + repo, ex);
        }
    }

    @Override
    public List<UUID> mergeBranch(UUID projectId, String repo, String branch, Instant at) {
        List<UUID> merged = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "update officium_card_dev_link set state = 'merged', updated_at = ? where project_id = ? "
                                + "and kind = 'branch' and repo = ? and ref = ? and state = 'open' returning card_id")) {
            statement.setTimestamp(1, Timestamp.from(at));
            statement.setObject(2, projectId);
            statement.setString(3, repo);
            statement.setString(4, branch);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    merged.add(rs.getObject(1, UUID.class));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to merge branch " + branch + " of " + repo, ex);
        }
        return merged;
    }

    private static DevLink map(ResultSet rs) throws SQLException {
        return new DevLink(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                rs.getObject("card_id", UUID.class), DevLink.Kind.fromWire(rs.getString("kind")),
                rs.getString("repo"), rs.getString("ref"), rs.getString("url"), rs.getString("title"),
                rs.getString("author"), DevLink.State.fromWire(rs.getString("state")),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    }
}
