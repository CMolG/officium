package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.github.GithubRepository;
import com.javadaba.contexts.officium.domain.ports.GithubRepositoryRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class JdbcGithubRepositoryRepository implements GithubRepositoryRepository {

    private static final String SELECT = "select repo, installation_id, project_id, installed_at, connected_at "
            + "from officium_github_repository";

    private final DataSource dataSource;

    public JdbcGithubRepositoryRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void saveInstalled(String repo, long installationId, Instant at) {
        execute("insert into officium_github_repository (repo, installation_id, installed_at) values (?, ?, ?) "
                + "on conflict (repo) do update set installation_id = excluded.installation_id", statement -> {
                    statement.setString(1, repo);
                    statement.setLong(2, installationId);
                    statement.setTimestamp(3, Timestamp.from(at));
                }, "record the installation on " + repo);
    }

    @Override
    public void removeInstalled(String repo) {
        execute("delete from officium_github_repository where repo = ?", statement -> statement.setString(1, repo),
                "forget the installation on " + repo);
    }

    @Override
    public Optional<GithubRepository> find(String repo) {
        List<GithubRepository> found = query(SELECT + " where repo = ?", statement -> statement.setString(1, repo));
        return found.stream().findFirst();
    }

    @Override
    public List<GithubRepository> listInstalled() {
        return query(SELECT + " order by repo", statement -> {
        });
    }

    @Override
    public boolean connect(String repo, UUID projectId, Instant at) {
        return execute("update officium_github_repository set project_id = ?, connected_at = ? where repo = ? "
                + "and (project_id is null or project_id = ?)", statement -> {
                    statement.setObject(1, projectId);
                    statement.setTimestamp(2, Timestamp.from(at));
                    statement.setString(3, repo);
                    statement.setObject(4, projectId);
                }, "connect " + repo) == 1;
    }

    @Override
    public boolean disconnect(String repo, UUID projectId) {
        return execute("update officium_github_repository set project_id = null, connected_at = null where repo = ? "
                + "and project_id = ?", statement -> {
                    statement.setString(1, repo);
                    statement.setObject(2, projectId);
                }, "disconnect " + repo) == 1;
    }

    @Override
    public boolean deliverySeen(String deliveryId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select 1 from officium_github_delivery where delivery_id = ?")) {
            statement.setString(1, deliveryId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read GitHub delivery " + deliveryId, ex);
        }
    }

    @Override
    public void recordDelivery(String deliveryId, String event, Instant at, Instant forgetBefore) {
        execute("insert into officium_github_delivery (delivery_id, event, received_at) values (?, ?, ?) "
                + "on conflict (delivery_id) do nothing", statement -> {
                    statement.setString(1, deliveryId);
                    statement.setString(2, event);
                    statement.setTimestamp(3, Timestamp.from(at));
                }, "record GitHub delivery " + deliveryId);
        execute("delete from officium_github_delivery where received_at < ?",
                statement -> statement.setTimestamp(1, Timestamp.from(forgetBefore)), "forget old GitHub deliveries");
    }

    @Override
    public void replaceGrants(UUID accountId, Map<String, Long> repos, Instant at) {
        // One transaction: a reader never sees the account with half its grants.
        try (Connection connection = dataSource.getConnection()) {
            boolean autoCommit = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try (PreparedStatement delete = connection.prepareStatement(
                    "delete from officium_github_grant where account_id = ?");
                    PreparedStatement insert = connection.prepareStatement("insert into officium_github_grant "
                            + "(account_id, repo, installation_id, granted_at) values (?, ?, ?, ?)")) {
                delete.setObject(1, accountId);
                delete.executeUpdate();
                for (Map.Entry<String, Long> repo : repos.entrySet()) {
                    insert.setObject(1, accountId);
                    insert.setString(2, repo.getKey());
                    insert.setLong(3, repo.getValue());
                    insert.setTimestamp(4, Timestamp.from(at));
                    insert.addBatch();
                }
                insert.executeBatch();
                connection.commit();
            } catch (SQLException ex) {
                connection.rollback();
                throw ex;
            } finally {
                connection.setAutoCommit(autoCommit);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to record the GitHub grants of " + accountId, ex);
        }
    }

    @Override
    public Set<String> grantedRepos(UUID accountId, Instant since) {
        Set<String> repos = new LinkedHashSet<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement("select repo from officium_github_grant "
                        + "where account_id = ? and granted_at >= ? order by repo")) {
            statement.setObject(1, accountId);
            statement.setTimestamp(2, Timestamp.from(since));
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    repos.add(rs.getString("repo"));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the GitHub grants of " + accountId, ex);
        }
        return repos;
    }

    @Override
    public void saveState(String stateHash, UUID accountId, UUID projectId, Instant expiresAt, Instant now) {
        execute("delete from officium_github_oauth_state where expires_at < ?",
                statement -> statement.setTimestamp(1, Timestamp.from(now)), "forget expired GitHub states");
        execute("insert into officium_github_oauth_state (state_hash, account_id, project_id, expires_at) "
                + "values (?, ?, ?, ?)", statement -> {
                    statement.setString(1, stateHash);
                    statement.setObject(2, accountId);
                    statement.setObject(3, projectId);
                    statement.setTimestamp(4, Timestamp.from(expiresAt));
                }, "record a GitHub authorization state");
    }

    @Override
    public Optional<IssuedState> consumeState(String stateHash) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement("delete from officium_github_oauth_state "
                        + "where state_hash = ? returning account_id, project_id, expires_at")) {
            statement.setString(1, stateHash);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return Optional.empty();
                }
                return Optional.of(new IssuedState(rs.getObject("account_id", UUID.class),
                        rs.getObject("project_id", UUID.class), rs.getTimestamp("expires_at").toInstant()));
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read a GitHub authorization state", ex);
        }
    }

    private interface Binder {
        void bind(PreparedStatement statement) throws SQLException;
    }

    private int execute(String sql, Binder binder, String what) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            binder.bind(statement);
            return statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to " + what, ex);
        }
    }

    private List<GithubRepository> query(String sql, Binder binder) {
        List<GithubRepository> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            binder.bind(statement);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    Timestamp connected = rs.getTimestamp("connected_at");
                    result.add(new GithubRepository(rs.getString("repo"), rs.getLong("installation_id"),
                            rs.getObject("project_id", UUID.class), rs.getTimestamp("installed_at").toInstant(),
                            connected == null ? null : connected.toInstant()));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the GitHub repositories", ex);
        }
        return result;
    }
}
