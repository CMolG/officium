package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocComment;
import com.javadaba.contexts.officium.domain.DocCommentReaction;
import com.javadaba.contexts.officium.domain.DocQuote;
import com.javadaba.contexts.officium.domain.ports.DocCommentRepository;
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
public class JdbcDocCommentRepository implements DocCommentRepository {

    private static final String SELECT = "select id, page_id, parent_id, author, text, quote_exact, quote_prefix, "
            + "quote_suffix, resolved_at, resolved_by, deleted_at, created_at, updated_at from officium_doc_comment";

    private final DataSource dataSource;

    public JdbcDocCommentRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void insert(DocComment c) {
        String sql = "insert into officium_doc_comment (id, page_id, parent_id, author, text, quote_exact, "
                + "quote_prefix, quote_suffix, resolved_at, resolved_by, deleted_at, created_at, updated_at) "
                + "values (?, ?, ?, cast(? as jsonb), ?, ?, ?, ?, ?, cast(? as jsonb), ?, ?, ?)";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement s = connection.prepareStatement(sql)) {
            s.setObject(1, c.id());
            s.setObject(2, c.pageId());
            s.setObject(3, c.parentId());
            s.setString(4, OfficiumJson.writeActor(c.author()));
            s.setString(5, c.text());
            s.setString(6, c.quote() == null ? null : c.quote().exact());
            s.setString(7, c.quote() == null ? null : c.quote().prefix());
            s.setString(8, c.quote() == null ? null : c.quote().suffix());
            s.setTimestamp(9, ts(c.resolvedAt()));
            s.setString(10, c.resolvedBy() == null ? null : OfficiumJson.writeActor(c.resolvedBy()));
            s.setTimestamp(11, ts(c.deletedAt()));
            s.setTimestamp(12, Timestamp.from(c.createdAt()));
            s.setTimestamp(13, Timestamp.from(c.updatedAt()));
            s.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert doc comment", ex);
        }
    }

    @Override
    public Optional<DocComment> find(UUID pageId, UUID commentId) {
        List<DocComment> rows = query(SELECT + " where page_id = ? and id = ?", pageId, commentId);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public List<DocComment> listByPage(UUID pageId) {
        return query(SELECT + " where page_id = ? order by created_at", pageId);
    }

    @Override
    public List<DocComment> listByPages(Collection<UUID> pageIds) {
        if (pageIds.isEmpty()) {
            return List.of();
        }
        try (Connection connection = dataSource.getConnection();
                PreparedStatement s = connection
                        .prepareStatement(SELECT + " where page_id = any(?) order by created_at")) {
            s.setArray(1, connection.createArrayOf("uuid", pageIds.toArray()));
            return read(s);
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list doc comments", ex);
        }
    }

    @Override
    public void update(DocComment c) {
        String sql = "update officium_doc_comment set text = ?, resolved_at = ?, resolved_by = cast(? as jsonb), "
                + "deleted_at = ?, updated_at = ? where id = ? and page_id = ?";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement s = connection.prepareStatement(sql)) {
            s.setString(1, c.text());
            s.setTimestamp(2, ts(c.resolvedAt()));
            s.setString(3, c.resolvedBy() == null ? null : OfficiumJson.writeActor(c.resolvedBy()));
            s.setTimestamp(4, ts(c.deletedAt()));
            s.setTimestamp(5, Timestamp.from(c.updatedAt()));
            s.setObject(6, c.id());
            s.setObject(7, c.pageId());
            s.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to update doc comment " + c.id(), ex);
        }
    }

    @Override
    public void delete(UUID pageId, UUID commentId) {
        run("delete from officium_doc_comment where page_id = ? and id = ?", pageId, commentId);
    }

    @Override
    public List<DocComment> repliesOf(UUID rootId) {
        return query(SELECT + " where parent_id = ? order by created_at", rootId);
    }

    @Override
    public List<DocCommentReaction> reactionsOf(Collection<UUID> commentIds) {
        if (commentIds.isEmpty()) {
            return List.of();
        }
        try (Connection connection = dataSource.getConnection();
                PreparedStatement s = connection.prepareStatement(
                        "select comment_id, emoji, account_id, name, at from officium_doc_comment_reaction "
                                + "where comment_id = any(?) order by at")) {
            s.setArray(1, connection.createArrayOf("uuid", commentIds.toArray()));
            List<DocCommentReaction> result = new ArrayList<>();
            try (ResultSet rs = s.executeQuery()) {
                while (rs.next()) {
                    result.add(new DocCommentReaction(rs.getObject("comment_id", UUID.class), rs.getString("emoji"),
                            rs.getObject("account_id", UUID.class), rs.getString("name"),
                            rs.getTimestamp("at").toInstant()));
                }
            }
            return result;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read doc comment reactions", ex);
        }
    }

    @Override
    public boolean addReaction(DocCommentReaction r) {
        String sql = "insert into officium_doc_comment_reaction (comment_id, emoji, account_id, name, at) "
                + "values (?, ?, ?, ?, ?) on conflict do nothing";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement s = connection.prepareStatement(sql)) {
            s.setObject(1, r.commentId());
            s.setString(2, r.emoji());
            s.setObject(3, r.accountId());
            s.setString(4, r.name());
            s.setTimestamp(5, Timestamp.from(r.at()));
            return s.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to react to doc comment " + r.commentId(), ex);
        }
    }

    @Override
    public boolean removeReaction(UUID commentId, String emoji, UUID accountId) {
        return run("delete from officium_doc_comment_reaction where comment_id = ? and emoji = ? and account_id = ?",
                commentId, emoji, accountId) == 1;
    }

    @Override
    public void clearReactions(UUID commentId) {
        run("delete from officium_doc_comment_reaction where comment_id = ?", commentId);
    }

    private List<DocComment> query(String sql, Object... params) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement s = connection.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                s.setObject(i + 1, params[i]);
            }
            return read(s);
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read doc comments", ex);
        }
    }

    private int run(String sql, Object... params) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement s = connection.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                s.setObject(i + 1, params[i]);
            }
            return s.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to write doc comments", ex);
        }
    }

    private static List<DocComment> read(PreparedStatement s) throws SQLException {
        List<DocComment> result = new ArrayList<>();
        try (ResultSet rs = s.executeQuery()) {
            while (rs.next()) {
                String exact = rs.getString("quote_exact");
                DocQuote quote = exact == null
                        ? null
                        : new DocQuote(exact, rs.getString("quote_prefix"), rs.getString("quote_suffix"));
                String resolvedBy = rs.getString("resolved_by");
                result.add(new DocComment(rs.getObject("id", UUID.class), rs.getObject("page_id", UUID.class),
                        rs.getObject("parent_id", UUID.class), OfficiumJson.readActor(rs.getString("author")),
                        rs.getString("text"), quote, instant(rs.getTimestamp("resolved_at")),
                        resolvedBy == null ? null : OfficiumJson.readActor(resolvedBy),
                        instant(rs.getTimestamp("deleted_at")), rs.getTimestamp("created_at").toInstant(),
                        rs.getTimestamp("updated_at").toInstant()));
            }
        }
        return result;
    }

    private static Timestamp ts(Instant at) {
        return at == null ? null : Timestamp.from(at);
    }

    private static Instant instant(Timestamp at) {
        return at == null ? null : at.toInstant();
    }
}
