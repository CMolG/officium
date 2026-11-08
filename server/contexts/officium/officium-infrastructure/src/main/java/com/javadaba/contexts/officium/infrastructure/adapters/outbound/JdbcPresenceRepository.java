package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DevicePresence;
import com.javadaba.contexts.officium.domain.ports.PresenceRepository;
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
import java.util.UUID;

@ApplicationScoped
public class JdbcPresenceRepository implements PresenceRepository {

    private static final String BEAT = """
            insert into officium_presence (account_id, device_id, label, visible, focused, first_seen_at, last_seen_at)
            values (?, ?, ?, ?, ?, ?, ?)
            on conflict (account_id, device_id) do update
              set label = excluded.label, visible = excluded.visible, focused = excluded.focused,
                  last_seen_at = excluded.last_seen_at, closed_at = null""";

    private static final String PRUNE = """
            delete from officium_presence
             where account_id = ?
               and (last_seen_at < ?
                    or device_id in (select device_id from officium_presence where account_id = ?
                                      order by last_seen_at desc, device_id offset ?))""";

    private final DataSource dataSource;

    public JdbcPresenceRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void beat(UUID accountId, UUID deviceId, String label, boolean visible, boolean focused, Instant at) {
        run(BEAT, accountId, deviceId, label, visible, focused, Timestamp.from(at), Timestamp.from(at));
    }

    @Override
    public void close(UUID accountId, UUID deviceId, Instant at) {
        run("update officium_presence set closed_at = ? where account_id = ? and device_id = ?",
                Timestamp.from(at), accountId, deviceId);
    }

    @Override
    public List<DevicePresence> list(UUID accountId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select device_id, label, visible, focused, first_seen_at, last_seen_at, closed_at "
                                + "from officium_presence where account_id = ?")) {
            statement.setObject(1, accountId);
            try (ResultSet rs = statement.executeQuery()) {
                List<DevicePresence> devices = new ArrayList<>();
                while (rs.next()) {
                    Timestamp closed = rs.getTimestamp("closed_at");
                    devices.add(new DevicePresence(accountId, rs.getObject("device_id", UUID.class),
                            rs.getString("label"), rs.getBoolean("visible"), rs.getBoolean("focused"),
                            rs.getTimestamp("first_seen_at").toInstant(), rs.getTimestamp("last_seen_at").toInstant(),
                            closed == null ? null : closed.toInstant()));
                }
                return devices;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the presence of " + accountId, ex);
        }
    }

    @Override
    public void prune(UUID accountId, Instant unseenBefore, int keep) {
        run(PRUNE, accountId, Timestamp.from(unseenBefore), accountId, keep);
    }

    private void run(String sql, Object... params) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                statement.setObject(i + 1, params[i]);
            }
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to update the presence rows", ex);
        }
    }
}
