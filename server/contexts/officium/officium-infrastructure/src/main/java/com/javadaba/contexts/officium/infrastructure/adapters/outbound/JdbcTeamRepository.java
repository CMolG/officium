package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.Team;
import com.javadaba.contexts.officium.domain.ports.TeamRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JdbcTeamRepository implements TeamRepository {

    private static final String SELECT = "select id, owner_account_id, name, description, version, created_at, "
            + "updated_at from officium_team";

    /** Best first, so a {@code limit 1} picks the strongest grant. */
    private static final String ROLE_RANK = "case tp.role when 'owner' then 0 when 'editor' then 1 else 2 end";

    private final DataSource dataSource;

    public JdbcTeamRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Team insert(Team team) {
        execute("insert into officium_team (id, owner_account_id, name, description, version, created_at, "
                + "updated_at) values (?, ?, ?, ?, ?, ?, ?)", team.id(), team.ownerAccountId(), team.name(),
                team.description(), team.version(), Timestamp.from(team.createdAt()), Timestamp.from(team.updatedAt()));
        return team;
    }

    @Override
    public Optional<Team> findById(UUID teamId) {
        List<Team> found = queryTeams(SELECT + " where id = ?", teamId);
        return found.isEmpty() ? Optional.empty() : Optional.of(found.get(0));
    }

    @Override
    public List<Team> listByOwner(UUID ownerAccountId) {
        return queryTeams(SELECT + " where owner_account_id = ? order by name", ownerAccountId);
    }

    @Override
    public boolean updateIfVersion(Team updated, int expectedVersion) {
        return execute("update officium_team set name = ?, description = ?, version = ?, updated_at = ? "
                + "where id = ? and version = ?", updated.name(), updated.description(), updated.version(),
                Timestamp.from(updated.updatedAt()), updated.id(), expectedVersion) == 1;
    }

    @Override
    public boolean deleteIfVersion(UUID teamId, int expectedVersion) {
        return execute("delete from officium_team where id = ? and version = ?", teamId, expectedVersion) == 1;
    }

    @Override
    public List<Team.Member> members(UUID teamId) {
        List<Team.Member> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select team_id, account_id, added_at from officium_team_member where team_id = ? "
                                + "order by added_at")) {
            statement.setObject(1, teamId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(new Team.Member(rs.getObject("team_id", UUID.class),
                            rs.getObject("account_id", UUID.class), rs.getTimestamp("added_at").toInstant()));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the members of team " + teamId, ex);
        }
        return result;
    }

    @Override
    public boolean addMember(Team.Member member) {
        return execute("insert into officium_team_member (team_id, account_id, added_at) values (?, ?, ?) "
                + "on conflict do nothing", member.teamId(), member.accountId(),
                Timestamp.from(member.addedAt())) == 1;
    }

    @Override
    public boolean removeMember(UUID teamId, UUID accountId) {
        return execute("delete from officium_team_member where team_id = ? and account_id = ?", teamId,
                accountId) == 1;
    }

    @Override
    public List<Team.Grant> grants(UUID teamId) {
        List<Team.Grant> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select team_id, project_id, role, created_at from officium_team_project where team_id = ? "
                                + "order by created_at")) {
            statement.setObject(1, teamId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(new Team.Grant(rs.getObject("team_id", UUID.class),
                            rs.getObject("project_id", UUID.class), Role.fromWire(rs.getString("role")),
                            rs.getTimestamp("created_at").toInstant()));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the projects of team " + teamId, ex);
        }
        return result;
    }

    @Override
    public void grant(Team.Grant grant) {
        execute("insert into officium_team_project (team_id, project_id, role, created_at) values (?, ?, ?, ?) "
                + "on conflict (team_id, project_id) do update set role = excluded.role", grant.teamId(),
                grant.projectId(), grant.role().wire(), Timestamp.from(grant.createdAt()));
    }

    @Override
    public boolean revoke(UUID teamId, UUID projectId) {
        return execute("delete from officium_team_project where team_id = ? and project_id = ?", teamId,
                projectId) == 1;
    }

    @Override
    public Optional<Role> bestGrant(UUID projectId, UUID accountId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select tp.role from officium_team_project tp join officium_team_member tm "
                                + "on tm.team_id = tp.team_id where tp.project_id = ? and tm.account_id = ? "
                                + "order by " + ROLE_RANK + " limit 1")) {
            statement.setObject(1, projectId);
            statement.setObject(2, accountId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(Role.fromWire(rs.getString(1))) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the team grants on " + projectId, ex);
        }
    }

    @Override
    public List<ProjectGrant> grantsOnProject(UUID projectId) {
        List<ProjectGrant> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select tm.account_id, t.id as team_id, t.name, tp.role from officium_team_project tp "
                                + "join officium_team t on t.id = tp.team_id "
                                + "join officium_team_member tm on tm.team_id = tp.team_id "
                                + "where tp.project_id = ? order by t.name, tm.added_at")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(new ProjectGrant(rs.getObject("account_id", UUID.class),
                            rs.getObject("team_id", UUID.class), rs.getString("name"),
                            Role.fromWire(rs.getString("role"))));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the team grants on " + projectId, ex);
        }
        return result;
    }

    private List<Team> queryTeams(String sql, UUID param) {
        List<Team> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, param);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(new Team(rs.getObject("id", UUID.class), rs.getObject("owner_account_id", UUID.class),
                            rs.getString("name"), rs.getString("description"), rs.getInt("version"),
                            rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant()));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read teams", ex);
        }
        return result;
    }

    private int execute(String sql, Object... params) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                statement.setObject(i + 1, params[i]);
            }
            return statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to write teams", ex);
        }
    }
}
