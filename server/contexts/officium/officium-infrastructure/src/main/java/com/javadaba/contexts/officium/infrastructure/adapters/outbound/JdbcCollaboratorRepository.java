package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.ports.CollaboratorRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class JdbcCollaboratorRepository implements CollaboratorRepository {

    private static final String SQL = "select pm.account_id from officium_project_member pm "
            + "join officium_project p on p.id = pm.project_id where p.owner_account_id = ? "
            + "union select tm.account_id from officium_team_project tp "
            + "join officium_team_member tm on tm.team_id = tp.team_id "
            + "join officium_project p on p.id = tp.project_id where p.owner_account_id = ?";

    private final DataSource dataSource;

    public JdbcCollaboratorRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Set<UUID> collaboratorsOf(UUID ownerAccountId) {
        Set<UUID> result = new HashSet<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(SQL)) {
            statement.setObject(1, ownerAccountId);
            statement.setObject(2, ownerAccountId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(rs.getObject(1, UUID.class));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to count the collaborators of " + ownerAccountId, ex);
        }
        result.remove(ownerAccountId);
        return result;
    }
}
