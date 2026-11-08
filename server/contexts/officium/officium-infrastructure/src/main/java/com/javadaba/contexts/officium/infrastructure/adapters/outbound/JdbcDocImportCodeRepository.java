package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocImportCode;
import com.javadaba.contexts.officium.domain.ports.DocImportCodeRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JdbcDocImportCodeRepository implements DocImportCodeRepository {

    private final DataSource dataSource;

    public JdbcDocImportCodeRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void save(DocImportCode code) {
        String sql = "insert into officium_doc_import_code (id, project_id, account_id, code_hash, expires_at, "
                + "closed_at, created_at) values (?, ?, ?, ?, ?, ?, ?)";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, code.id());
            statement.setObject(2, code.projectId());
            statement.setObject(3, code.accountId());
            statement.setString(4, code.codeHash());
            statement.setTimestamp(5, Timestamp.from(code.expiresAt()));
            statement.setTimestamp(6, code.closedAt() == null ? null : Timestamp.from(code.closedAt()));
            statement.setTimestamp(7, Timestamp.from(code.createdAt()));
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save a documentation import code", ex);
        }
    }

    @Override
    public Optional<DocImportCode> findByCodeHash(String codeHash) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select id, project_id, account_id, expires_at, closed_at, created_at "
                                + "from officium_doc_import_code where code_hash = ?")) {
            statement.setString(1, codeHash);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return Optional.empty();
                }
                Timestamp closed = rs.getTimestamp("closed_at");
                return Optional.of(new DocImportCode(rs.getObject("id", UUID.class),
                        rs.getObject("project_id", UUID.class), rs.getObject("account_id", UUID.class), codeHash,
                        rs.getTimestamp("expires_at").toInstant(), closed == null ? null : closed.toInstant(),
                        rs.getTimestamp("created_at").toInstant()));
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read a documentation import code", ex);
        }
    }

    @Override
    public boolean close(UUID id, Instant now) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "update officium_doc_import_code set closed_at = ? where id = ? and closed_at is null")) {
            statement.setTimestamp(1, Timestamp.from(now));
            statement.setObject(2, id);
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to close a documentation import", ex);
        }
    }

    @Override
    public int countLive(UUID projectId, Instant now) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select count(*) from officium_doc_import_code where project_id = ? and closed_at is null "
                                + "and expires_at > ?")) {
            statement.setObject(1, projectId);
            statement.setTimestamp(2, Timestamp.from(now));
            try (ResultSet rs = statement.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to count the import codes of " + projectId, ex);
        }
    }

    @Override
    public void deleteSpent(Instant now) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "delete from officium_doc_import_code where expires_at <= ? or closed_at is not null")) {
            statement.setTimestamp(1, Timestamp.from(now));
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to sweep spent documentation import codes", ex);
        }
    }
}
