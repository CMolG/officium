package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.DocLifecycle;
import com.javadaba.contexts.officium.domain.DocPageSummary;
import com.javadaba.contexts.officium.domain.DocSearchHit;
import com.javadaba.contexts.officium.domain.DocSearchQuery;
import com.javadaba.contexts.officium.domain.DocSnippet;
import com.javadaba.contexts.officium.domain.ports.DocSearchPort;
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

/**
 * Full-text search over the documentation (JAVA-800), one statement. The query is
 * {@code websearch_to_tsquery} (Outline's operators) with every term matched as a prefix. A plain
 * query also keeps what the old {@code ilike} search found: a page whose path, title or body contains
 * the text as typed, after the full-text matches, because the {@code simple} parser keeps
 * {@code contracts/officium-api} as one token. Officium's own pages enter through {@code unnest}, so one
 * ranking covers both.
 */
@ApplicationScoped
public class JdbcDocSearch implements DocSearchPort {

    /** The expression behind {@code officium_doc_page.search_vector}, for pages the table does not hold. */
    private static final String EXTRA_VECTOR = "(setweight(to_tsvector('simple', coalesce(e.title, '') || ' ' "
            + "|| e.path || ' ' || replace(replace(e.path, '/', ' '), '-', ' ')), 'A') "
            + "|| setweight(to_tsvector('simple', left(coalesce(e.body, ''), 300000)), 'B'))";

    /** Every quoted lexeme of a tsquery gets {@code :*}: the term matches as a prefix. */
    private static final String PREFIX = "case when numnode(base) = 0 then base else regexp_replace(base::text, "
            + "'''(?:[^'']|'''')+''', '\\&:*', 'g')::tsquery end";

    private static final String HEADLINE_OPTIONS = "StartSel=" + DocSnippet.START + ", StopSel=" + DocSnippet.STOP
            + ", MaxFragments=2, MaxWords=30, MinWords=12, FragmentDelimiter=\" … \"";

    private final DataSource dataSource;

    public JdbcDocSearch(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public List<DocSearchHit> search(UUID projectId, UUID accountId, DocSearchQuery query, List<Extra> extras) {
        try (Connection connection = dataSource.getConnection()) {
            List<Object> params = new ArrayList<>();
            String sql = statement(connection, projectId, accountId, query, extras, params);
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                for (int i = 0; i < params.size(); i++) {
                    statement.setObject(i + 1, params.get(i));
                }
                List<DocSearchHit> hits = new ArrayList<>();
                try (ResultSet rs = statement.executeQuery()) {
                    while (rs.next()) {
                        hits.add(hit(rs, query));
                    }
                }
                return hits;
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to search the pages of " + projectId, ex);
        }
    }

    private static String statement(Connection connection, UUID projectId, UUID accountId, DocSearchQuery query,
            List<Extra> extras, List<Object> params) throws SQLException {
        String me = accountId.toString();
        StringBuilder sql = new StringBuilder();
        sql.append("with q as (select websearch_to_tsquery('simple', ?) as base, cast(? as text) as pat, "
                + "cast(? as text) as raw), t as (select ").append(PREFIX).append(" as tsq, pat, raw from q), ");
        params.add(query.text());
        params.add(query.isPlain() ? "%" + escape(query.text()) + "%" : null);
        params.add(query.text());

        sql.append(
                "cand as (select p.id, p.path, p.title, p.body, p.version, cast(p.updated_by as text) as updated_by, "
                        + "p.updated_at, p.published_at, p.archived_at, cast(p.archived_by as text) as archived_by, "
                        + "p.deleted_at, cast(p.deleted_by as text) as deleted_by, p.search_vector as vec "
                        // A template is never a search result (JAVA-801): Templates lists it.
                        + "from officium_doc_page p where p.project_id = ? and p.deleted_at is null and not p.template ");
        params.add(projectId);
        pageFilters(sql, params, query, me);
        sql.append("union all select e.id, e.path, e.title, e.body, 1, e.actor, e.updated_at, e.updated_at, "
                + "cast(null as timestamptz), cast(null as text), cast(null as timestamptz), cast(null as text), ")
                .append(EXTRA_VECTOR)
                .append(" from unnest(?, ?, ?, ?, ?, ?) as e(id, path, title, body, updated_at, actor)), ");
        arrays(connection, params, extras);

        sql.append(
                "m as (select c.*, t.tsq, t.raw, (c.vec @@ t.tsq) as ft, (ts_filter(c.vec, '{a}') @@ t.tsq) as head, "
                        + "ts_rank(c.vec, t.tsq) as rank, case when c.vec @@ t.tsq then false else coalesce(c.path ilike t.pat "
                        + "or c.title ilike t.pat or c.body ilike t.pat, false) end as sub, coalesce(c.path ilike t.pat or c.title ilike t.pat, false) "
                        + "as sub_head from cand c cross join t), "
                        + "r as (select m.*, row_number() over (order by ft desc, head desc, rank desc, sub_head desc, path) "
                        + "as rn from m where ft or sub), "
                        + "s as (select r.*, case when rn - ? <= " + DocSearchQuery.SNIPPETS
                        + " then regexp_replace(body, '^---\\n.*?\\n---\\n', '') end as clean from r where rn > ? ");
        params.add(query.offset());
        params.add(query.offset());
        if (query.limit() != null) {
            sql.append("and rn <= ? ");
            params.add(query.offset() + query.limit());
        }
        sql.append(") select id, path, title, version, updated_by, updated_at, published_at, archived_at, archived_by, "
                + "deleted_at, deleted_by, ft, case when clean is null then null when ft then "
                + "ts_headline('simple', clean, tsq, ?) else substr(clean, greatest(strpos(lower(clean), lower(raw)) "
                + "- 60, 1), 160) end as snippet from s order by rn");
        params.add(HEADLINE_OPTIONS);
        return sql.toString();
    }

    private static void pageFilters(StringBuilder sql, List<Object> params, DocSearchQuery query, String me) {
        String own = "p.created_by->>'accountId' = ?";
        String state = query.state();
        if (state == null) {
            sql.append("and p.archived_at is null and (p.published_at is not null or ").append(own).append(") ");
            params.add(me);
        } else if (state.equals("published")) {
            sql.append("and p.archived_at is null and p.published_at is not null ");
        } else if (state.equals("unpublished")) {
            sql.append("and p.archived_at is null and p.published_at is null and ").append(own).append(' ');
            params.add(me);
        } else {
            sql.append("and p.archived_at is not null and (p.published_at is not null or ").append(own).append(") ");
            params.add(me);
        }
        if (query.collection() != null) {
            sql.append("and (p.path = ? or p.path like ?) ");
            params.add(query.collection());
            params.add(query.collection() + "/%");
        }
        if (query.author() != null) {
            sql.append("and (p.created_by->>'accountId' = ? or p.updated_by->>'accountId' = ?) ");
            params.add(query.author().toString());
            params.add(query.author().toString());
        }
        if (query.updatedAfter() != null) {
            sql.append("and p.updated_at >= ? ");
            params.add(Timestamp.from(query.updatedAfter()));
        }
        if (query.updatedBefore() != null) {
            sql.append("and p.updated_at <= ? ");
            params.add(Timestamp.from(query.updatedBefore()));
        }
    }

    /** Officium's own pages as six parallel arrays, the shape {@code unnest} takes. */
    private static void arrays(Connection connection, List<Object> params, List<Extra> extras) throws SQLException {
        params.add(connection.createArrayOf("uuid", extras.stream().map(Extra::id).toArray()));
        params.add(connection.createArrayOf("text", extras.stream().map(Extra::path).toArray()));
        params.add(connection.createArrayOf("text", extras.stream().map(Extra::title).toArray()));
        params.add(connection.createArrayOf("text", extras.stream().map(Extra::body).toArray()));
        params.add(connection.createArrayOf("timestamptz",
                extras.stream().map(extra -> Timestamp.from(extra.updatedAt())).toArray()));
        params.add(connection.createArrayOf("text",
                extras.stream().map(extra -> OfficiumJson.writeActor(extra.author())).toArray()));
    }

    private static DocSearchHit hit(ResultSet rs, DocSearchQuery query) throws SQLException {
        Instant publishedAt = instant(rs, "published_at");
        DocLifecycle lifecycle = new DocLifecycle(publishedAt, instant(rs, "archived_at"),
                actor(rs.getString("archived_by")), instant(rs, "deleted_at"), actor(rs.getString("deleted_by")));
        DocPageSummary page = new DocPageSummary(rs.getObject("id", UUID.class), rs.getString("path"),
                rs.getString("title"), rs.getInt("version"), OfficiumJson.readActor(rs.getString("updated_by")),
                rs.getTimestamp("updated_at").toInstant(), lifecycle);
        String snippet = rs.getString("snippet");
        List<DocSnippet.Part> parts = snippet == null
                ? List.of()
                : rs.getBoolean("ft") ? DocSnippet.fromMarked(snippet) : DocSnippet.window(snippet, query.text());
        return new DocSearchHit(page, parts);
    }

    private static String escape(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private static com.javadaba.contexts.officium.domain.Actor actor(String json) {
        return json == null ? null : OfficiumJson.readActor(json);
    }
}
