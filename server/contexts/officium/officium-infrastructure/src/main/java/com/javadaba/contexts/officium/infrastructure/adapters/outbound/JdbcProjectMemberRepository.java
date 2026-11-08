package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.ProjectMember;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.ProjectMemberRepository;
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
public class JdbcProjectMemberRepository implements ProjectMemberRepository {

    private static final String SELECT = "select project_id, account_id, role, created_at from officium_project_member";

    private final DataSource dataSource;

    public JdbcProjectMemberRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public ProjectMember insert(ProjectMember member) {
        String sql = "insert into officium_project_member (project_id, account_id, role, created_at) values (?, ?, ?, ?)";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, member.projectId());
            statement.setObject(2, member.accountId());
            statement.setString(3, member.role().wire());
            statement.setTimestamp(4, Timestamp.from(member.createdAt()));
            statement.executeUpdate();
            return member;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert project member", ex);
        }
    }

    @Override
    public Optional<ProjectMember> find(UUID projectId, UUID accountId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where project_id = ? and account_id = ?")) {
            statement.setObject(1, projectId);
            statement.setObject(2, accountId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(map(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to find project member", ex);
        }
    }

    @Override
    public List<ProjectMember> listByProject(UUID projectId) {
        List<ProjectMember> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT + " where project_id = ? order by created_at")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(map(rs));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list members of " + projectId, ex);
        }
        return result;
    }

    @Override
    public void updateRole(UUID projectId, UUID accountId, Role role) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "update officium_project_member set role = ? where project_id = ? and account_id = ?")) {
            statement.setString(1, role.wire());
            statement.setObject(2, projectId);
            statement.setObject(3, accountId);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to update member role", ex);
        }
    }

    @Override
    public void remove(UUID projectId, UUID accountId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_project_member where project_id = ? and account_id = ?")) {
            statement.setObject(1, projectId);
            statement.setObject(2, accountId);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to remove member", ex);
        }
    }

    private static ProjectMember map(ResultSet rs) throws SQLException {
        return new ProjectMember(rs.getObject("project_id", UUID.class), rs.getObject("account_id", UUID.class),
                Role.fromWire(rs.getString("role")), rs.getTimestamp("created_at").toInstant());
    }
}
