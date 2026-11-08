package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.AgentRun;
import com.javadaba.contexts.officium.domain.ports.AgentRunRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JdbcAgentRunRepository implements AgentRunRepository {

    private static final String SELECT = "select id, project_id, card_id, actor, started_at, last_seen_at, ended_at "
            + "from officium_agent_run";

    private final DataSource dataSource;

    public JdbcAgentRunRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Optional<AgentRun> findOpen(UUID cardId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where card_id = ? and ended_at is null")) {
            statement.setObject(1, cardId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the run of " + cardId, ex);
        }
    }

    @Override
    public AgentRun insert(AgentRun run) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "insert into officium_agent_run (id, project_id, card_id, actor, started_at, last_seen_at, "
                                + "ended_at) values (?, ?, ?, cast(? as jsonb), ?, ?, ?)")) {
            statement.setObject(1, run.id());
            statement.setObject(2, run.projectId());
            statement.setObject(3, run.cardId());
            statement.setString(4, OfficiumJson.writeActor(run.agent()));
            statement.setTimestamp(5, Timestamp.from(run.startedAt()));
            statement.setTimestamp(6, Timestamp.from(run.lastSeenAt()));
            statement.setTimestamp(7, run.endedAt() == null ? null : Timestamp.from(run.endedAt()));
            statement.executeUpdate();
            return run;
        } catch (SQLException ex) {
            // uq_officium_agent_run_open: two writes started the same card's run at once; one run it is.
            if ("23505".equals(ex.getSQLState())) {
                return findOpen(run.cardId()).orElseThrow(() -> new IllegalStateException(
                        "Run of " + run.cardId() + " both exists and doesn't", ex));
            }
            throw new IllegalStateException("Unable to record the run of " + run.cardId(), ex);
        }
    }

    @Override
    public void touch(UUID runId, Instant lastSeenAt, String machine) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "update officium_agent_run set last_seen_at = greatest(last_seen_at, ?), "
                                + "actor = case when cast(? as text) is null then actor "
                                + "else jsonb_set(actor, '{machine}', to_jsonb(cast(? as text))) end "
                                + "where id = ? and ended_at is null")) {
            statement.setTimestamp(1, Timestamp.from(lastSeenAt));
            statement.setString(2, machine);
            statement.setString(3, machine);
            statement.setObject(4, runId);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to renew run " + runId, ex);
        }
    }

    @Override
    public boolean close(UUID runId, Instant endedAt) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "update officium_agent_run set ended_at = ? where id = ? and ended_at is null")) {
            statement.setTimestamp(1, Timestamp.from(endedAt));
            statement.setObject(2, runId);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to close run " + runId, ex);
        }
    }

    @Override
    public List<AgentRun> openSeenBefore(Instant cutoff) {
        return open("last_seen_at < ?", cutoff, "lapsed");
    }

    @Override
    public List<AgentRun> openSeenAfter(Instant cutoff) {
        return open("last_seen_at > ?", cutoff, "live");
    }

    private List<AgentRun> open(String seen, Instant cutoff, String which) {
        List<AgentRun> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where ended_at is null and " + seen)) {
            statement.setTimestamp(1, Timestamp.from(cutoff));
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the " + which + " runs", ex);
        }
        return result;
    }

    @Override
    public List<AgentRun> latestOf(Collection<UUID> cardIds) {
        List<AgentRun> result = new ArrayList<>();
        if (cardIds.isEmpty()) {
            return result;
        }
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select distinct on (card_id) id, project_id, card_id, actor, started_at, last_seen_at, "
                                + "ended_at from officium_agent_run where card_id = any(?) "
                                + "order by card_id, started_at desc")) {
            statement.setArray(1, connection.createArrayOf("uuid", cardIds.toArray()));
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the latest runs", ex);
        }
        return result;
    }

    private static AgentRun map(ResultSet rs) throws SQLException {
        Timestamp endedAt = rs.getTimestamp("ended_at");
        return new AgentRun(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                rs.getObject("card_id", UUID.class), OfficiumJson.readActor(rs.getString("actor")),
                rs.getTimestamp("started_at").toInstant(), rs.getTimestamp("last_seen_at").toInstant(),
                endedAt == null ? null : endedAt.toInstant());
    }
}
