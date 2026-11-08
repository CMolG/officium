package com.javadaba.contexts.officium.domain.jql;

import java.util.List;

/**
 * A safe (necessary, never sufficient) text hint pulled from a query's top-level {@code AND}
 * clauses, so {@code CardService} can narrow candidates through {@code SearchIndexPort} the same
 * way {@code cards.search} itself does, before the full predicate runs over them (contract
 * JDB-270: "evaluate over the search index candidates").
 *
 * <p>Only a positive {@code ~} clause on a text-like field AT THE TOP LEVEL is safe to narrow by:
 * every matching card MUST contain it (it is AND-ed with everything else), so over-fetching by it
 * can never drop a true result. A clause inside an {@code OR} branch, a {@code NOT}, or a
 * negated {@code !~} give no such guarantee and are left alone -- {@code null} tells the caller
 * to read the whole project instead, exactly what {@code cards.search} itself does with no
 * {@code text} filter.
 */
public final class JqlTextHint {

    private JqlTextHint() {
    }

    public static String extract(JqlNode where) {
        if (where == null) {
            return null;
        }
        List<JqlNode> items = where instanceof JqlNode.And and ? and.items() : List.of(where);
        StringBuilder hint = new StringBuilder();
        for (JqlNode item : items) {
            if (item instanceof JqlNode.Clause clause && clause.op() == JqlOp.CONTAINS
                    && isTextLike(clause.field())) {
                for (JqlValue value : clause.values()) {
                    if (hint.length() > 0) {
                        hint.append(' ');
                    }
                    hint.append(value.raw());
                }
            }
        }
        return hint.length() == 0 ? null : hint.toString();
    }

    private static boolean isTextLike(JqlFieldId field) {
        return field == JqlFieldId.TEXT || field == JqlFieldId.SUMMARY || field == JqlFieldId.DESCRIPTION;
    }
}
