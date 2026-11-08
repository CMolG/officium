package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.CardTimeEntry;
import com.javadaba.contexts.officium.domain.TimeConcept;
import com.javadaba.contexts.officium.domain.TimeSource;
import com.javadaba.contexts.officium.domain.TokenUsage;
import com.javadaba.contexts.officium.domain.ports.CardTimeEntryRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class JdbcCardTimeEntryRepository implements CardTimeEntryRepository {

    private static final String COLUMNS = "id, card_id, entry_date, hours, who, account_id, note, created_at, source, "
            + "concept, model, tokens_in, cached_tokens_in, reasoning_tokens, tokens_out, started_at, ended_at, "
            + "session_ref, subagent, effort, profile_id, attended, cache_write_5m_tokens, cache_write_1h_tokens";

    private static final String SELECT = "select " + COLUMNS + " from officium_card_time_entry";

    private final DataSource dataSource;

    public JdbcCardTimeEntryRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public CardTimeEntry insert(CardTimeEntry entry) {
        String sql = "insert into officium_card_time_entry (" + COLUMNS + ") "
                + "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, entry.id());
            statement.setObject(2, entry.cardId());
            statement.setDate(3, Date.valueOf(entry.date()));
            statement.setDouble(4, entry.hours());
            statement.setString(5, entry.who());
            statement.setObject(6, entry.accountId());
            statement.setString(7, entry.note());
            statement.setTimestamp(8, Timestamp.from(entry.createdAt()));
            statement.setString(9, entry.source().wire());
            statement.setString(10, entry.concept().wire());
            statement.setString(11, entry.model());
            TokenUsage tokens = entry.tokens();
            statement.setObject(12, tokens == null ? null : tokens.tokensIn());
            statement.setObject(13, tokens == null ? null : tokens.cachedTokensIn());
            statement.setObject(14, tokens == null ? null : tokens.reasoningTokens());
            statement.setObject(15, tokens == null ? null : tokens.tokensOut());
            statement.setTimestamp(16, timestamp(entry.startedAt()));
            statement.setTimestamp(17, timestamp(entry.endedAt()));
            statement.setString(18, entry.sessionRef());
            statement.setString(19, entry.subagent());
            statement.setString(20, entry.effort());
            statement.setString(21, entry.profileId());
            statement.setObject(22, entry.attended());
            statement.setLong(23, tokens == null ? 0 : tokens.cacheWrite5mTokens());
            statement.setLong(24, tokens == null ? 0 : tokens.cacheWrite1hTokens());
            statement.executeUpdate();
            return entry;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert time entry", ex);
        }
    }

    @Override
    public Optional<CardTimeEntry> findById(UUID cardId, UUID entryId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where card_id = ? and id = ?")) {
            statement.setObject(1, cardId);
            statement.setObject(2, entryId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to find time entry " + entryId, ex);
        }
    }

    @Override
    public List<CardTimeEntry> listByCard(UUID cardId) {
        List<CardTimeEntry> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where card_id = ? order by entry_date, started_at nulls first, created_at")) {
            statement.setObject(1, cardId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list time entries for " + cardId, ex);
        }
        return result;
    }

    @Override
    public CardTimeEntry update(CardTimeEntry entry) {
        String sql = "update officium_card_time_entry set entry_date = ?, hours = ?, who = ?, note = ? "
                + "where id = ? and card_id = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setDate(1, Date.valueOf(entry.date()));
            statement.setDouble(2, entry.hours());
            statement.setString(3, entry.who());
            statement.setString(4, entry.note());
            statement.setObject(5, entry.id());
            statement.setObject(6, entry.cardId());
            statement.executeUpdate();
            return entry;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to update time entry " + entry.id(), ex);
        }
    }

    @Override
    public void delete(UUID cardId, UUID entryId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_card_time_entry where card_id = ? and id = ?")) {
            statement.setObject(1, cardId);
            statement.setObject(2, entryId);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to delete time entry " + entryId, ex);
        }
    }

    @Override
    public List<CardTimeEntry> listByProjectAndRange(UUID projectId, LocalDate from, LocalDate to, String person) {
        return listKeyedByProjectAndRange(projectId, from, to, person).stream().map(KeyedTimeEntry::entry).toList();
    }

    @Override
    public List<KeyedTimeEntry> listKeyedByProjectAndRange(UUID projectId, LocalDate from, LocalDate to,
            String person) {
        StringBuilder sql = new StringBuilder("select c.key as card_key, "
                + "case when c.deleted_at is null then c.title end as card_title, "
                + "case when c.deleted_at is null then c.epic end as card_epic, "
                + "case when c.deleted_at is null then c.status end as card_status, "
                + Arrays.stream(COLUMNS.split(", "))
                        .map(column -> "e." + column).collect(Collectors.joining(", "))
                + " from officium_card_time_entry e join officium_card c on c.id = e.card_id "
                + "where c.project_id = ? and e.entry_date >= ? and e.entry_date <= ?");
        if (person != null && !person.isBlank()) {
            sql.append(" and e.who = ?");
        }
        sql.append(" order by e.entry_date, e.created_at");
        List<KeyedTimeEntry> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql.toString())) {
            statement.setObject(1, projectId);
            statement.setDate(2, Date.valueOf(from));
            statement.setDate(3, Date.valueOf(to));
            if (person != null && !person.isBlank()) {
                statement.setString(4, person);
            }
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(new KeyedTimeEntry(map(rs), rs.getString("card_key"), rs.getString("card_title"),
                            rs.getString("card_epic"), rs.getString("card_status")));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to build timesheet for " + projectId, ex);
        }
        return result;
    }

    @Override
    public java.util.Map<UUID, Double> totalHoursByCards(Collection<UUID> cardIds) {
        java.util.Map<UUID, Double> result = new java.util.HashMap<>();
        if (cardIds.isEmpty()) {
            return result;
        }
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select card_id, sum(hours) as hours from officium_card_time_entry "
                                + "where card_id = any(?) group by card_id")) {
            statement.setArray(1, connection.createArrayOf("uuid", cardIds.toArray()));
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.put(rs.getObject("card_id", UUID.class), rs.getDouble("hours"));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to total the hours of " + cardIds.size() + " cards", ex);
        }
        return result;
    }

    @Override
    public java.util.Map<UUID, Double> totalHoursByCard(UUID projectId) {
        java.util.Map<UUID, Double> result = new java.util.HashMap<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select e.card_id, sum(e.hours) as hours from officium_card_time_entry e "
                                + "join officium_card c on c.id = e.card_id where c.project_id = ? group by e.card_id")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.put(rs.getObject("card_id", UUID.class), rs.getDouble("hours"));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to total the hours of " + projectId, ex);
        }
        return result;
    }

    @Override
    public java.util.Map<UUID, TokenUsage> tokensByCard(UUID projectId) {
        java.util.Map<UUID, TokenUsage> result = new java.util.HashMap<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select e.card_id, sum(e.tokens_in) as tokens_in, sum(e.cached_tokens_in) as cached_tokens_in, "
                                + "sum(e.reasoning_tokens) as reasoning_tokens, sum(e.tokens_out) as tokens_out, "
                                + "sum(e.cache_write_5m_tokens) as cache_write_5m_tokens, sum(e.cache_write_1h_tokens) as cache_write_1h_tokens "
                                + "from officium_card_time_entry e join officium_card c on c.id = e.card_id "
                                + "where c.project_id = ? and e.tokens_out is not null group by e.card_id")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.put(rs.getObject("card_id", UUID.class), usage(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to total the tokens of " + projectId, ex);
        }
        return result;
    }

    @Override
    public void deleteBySession(String sessionRef) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_card_time_entry where session_ref = ?")) {
            statement.setString(1, sessionRef);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to replace the entries of session " + sessionRef, ex);
        }
    }

    @Override
    public void deleteRunEntriesOverlapping(Collection<UUID> cardIds, String who, Instant from, Instant to) {
        if (cardIds.isEmpty()) {
            return;
        }
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_card_time_entry where source = ? and who = ? and card_id = any(?) "
                                + "and started_at < ? and ended_at > ?")) {
            statement.setString(1, TimeSource.AGENT_RUN.wire());
            statement.setString(2, who);
            statement.setArray(3, connection.createArrayOf("uuid", cardIds.toArray()));
            statement.setTimestamp(4, Timestamp.from(to));
            statement.setTimestamp(5, Timestamp.from(from));
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to supersede run-imputed time", ex);
        }
    }

    @Override
    public Optional<Instant> latestSessionEnd(UUID cardId, String who) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select max(ended_at) as ended_at from officium_card_time_entry "
                                + "where card_id = ? and who = ? and source = ?")) {
            statement.setObject(1, cardId);
            statement.setString(2, who);
            statement.setString(3, TimeSource.AGENT_SESSION.wire());
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.ofNullable(instant(rs, "ended_at")) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the last session report of " + cardId, ex);
        }
    }

    private static CardTimeEntry map(ResultSet rs) throws SQLException {
        Long tokensOut = rs.getObject("tokens_out", Long.class);
        TokenUsage tokens = tokensOut == null ? null : usage(rs);
        return new CardTimeEntry(rs.getObject("id", UUID.class), rs.getObject("card_id", UUID.class),
                rs.getDate("entry_date").toLocalDate(), rs.getDouble("hours"), rs.getString("who"),
                rs.getObject("account_id", UUID.class), rs.getString("note"),
                rs.getTimestamp("created_at").toInstant(), TimeSource.fromWire(rs.getString("source")),
                TimeConcept.fromWire(rs.getString("concept")), rs.getString("model"), rs.getString("effort"), tokens,
                instant(rs, "started_at"), instant(rs, "ended_at"), rs.getString("session_ref"),
                rs.getString("subagent"), rs.getString("profile_id"), rs.getObject("attended", Boolean.class));
    }

    private static TokenUsage usage(ResultSet rs) throws SQLException {
        return new TokenUsage(rs.getLong("tokens_in"), rs.getLong("cached_tokens_in"), rs.getLong("reasoning_tokens"),
                rs.getLong("tokens_out"), rs.getLong("cache_write_5m_tokens"), rs.getLong("cache_write_1h_tokens"));
    }

    private static Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }
}
